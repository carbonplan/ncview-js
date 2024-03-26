import * as zarr from 'zarrita/v2'
import FetchStore from 'zarrita/storage/fetch'
import ndarray from 'ndarray'
import unpack from 'ndarray-unpack'
import {
  Blosc,
  //GZip,
  Zlib,
  // LZ4,
  // Zstd,
} from 'numcodecs'

import { sanitizeUrl } from './url'
import { PROJECTIONS, ASPECTS } from '../constants'

const COMPRESSORS = {
  zlib: Zlib,
  blosc: Blosc,
}

const getRange = (arr, { nullValue }) => {
  return arr
    .filter((d) => !Number.isNaN(d) && d !== nullValue && d !== -1000) // TODO: remove after demo
    .reduce(
      ([min, max], d) => [
        Math.min(Number(min), Number(d)),
        Math.max(Number(max), Number(d)),
      ],
      [Infinity, -Infinity]
    )
}

const getChunkBounds = (chunkKeyArray, { axes, chunk_shape }) => {
  return Object.keys(axes).reduce((accum, key) => {
    const { array, index, step } = axes[key]
    if (!array) {
      return accum
    }
    const start = chunkKeyArray[index] * chunk_shape[index]
    const end = start + chunk_shape[index] - 1

    const initialBounds = [
      array.data[start],
      array.data[Math.min(end, array.data.length - 1)],
    ]
      .map(Number)
      .sort((a, b) => a - b)

    return {
      ...accum,
      [key]: [initialBounds[0] - step / 2, initialBounds[1] + step / 2],
    }
  }, {})
}

const getNullValue = (dataArray) => {
  let nullValue = dataArray.fill_value ?? 0
  if (/NaN/gi.test(nullValue)) {
    nullValue = NaN
  }

  return nullValue
}

export const toKeyString = (chunkKeyArray, { chunk_separator }) => {
  if (chunkKeyArray.length === 0) {
    return ''
  }

  return chunkKeyArray.join(chunk_separator)
}
export const toKeyArray = (chunkKey, { chunk_separator }) => {
  if (chunkKey.length === 0) {
    return []
  }

  return chunkKey.split(chunk_separator).map(Number)
}

export const getMetadata = async (url, pyramid) => {
  // fetch zmetadata to figure out compression and variables
  const response = await fetch(`${url}/.zmetadata`)
  const metadata = await response.json()

  if (!metadata.metadata) {
    throw new Error(metadata?.message || 'Unable to parse metadata')
  }

  const prefix = pyramid ? '0/' : ''
  const variables = Object.keys(metadata.metadata)
    .map((k) => k.match(pyramid ? /0\/\w+(?=\/\.zarray)/ : /\w+(?=\/\.zarray)/))
    .filter(Boolean)
    .map((a) => a[0].replace('0/', ''))
    .filter((d) => !['lat', 'lon'].includes(d))
    .filter((d) => metadata.metadata[`${prefix}${d}/.zarray`].shape.length >= 2)
    .filter((d) =>
      metadata.metadata[`${prefix}${d}/.zattrs`]['_ARRAY_DIMENSIONS'].every(
        (dim) => metadata.metadata[`${prefix}${dim}/.zarray`]
      )
    )

  const levels = Object.keys(metadata.metadata)
    .map((k) => k.match(new RegExp(`[0-9]+(?=\/${variables[0]}\/.zarray)`)))
    .filter(Boolean)
    .map((a) => a[0])

  return { metadata, variables, levels }
}

const getChunkShapeOverride = (chunkShape, shape, dimensions, axes) => {
  if (chunkShape.length === 1) {
    return null
  }

  const fullSpace =
    dimensions
      .filter((d) => [axes.X, axes.Y].includes(d))
      .every((d) => d <= 360) &&
    chunkShape.reduce((product, d) => product * d, 1) < 1000000

  return dimensions.map((d, i) => {
    if ([axes.X, axes.Y].includes(d)) {
      return fullSpace ? chunkShape[i] : Math.min(128, chunkShape[i])
    } else if (d === axes.T) {
      return Math.min(30, shape[i])
    } else {
      return 1
    }
  })
}

const getChunksOverrides = (metadata, variables, cfAxes) => {
  const coordinates = new Set(
    variables.flatMap(
      (variable) =>
        metadata.metadata[`${variable}/.zattrs`]['_ARRAY_DIMENSIONS']
    )
  )

  const result = {}

  coordinates.forEach((coordinate) => {
    const { shape, chunks } = metadata.metadata[`${coordinate}/.zarray`]

    if (shape.some((d, i) => d !== chunks[i])) {
      result[coordinate] = shape
    }
  })

  variables.forEach((variable) => {
    const nativeChunks = metadata.metadata[`${variable}/.zarray`].chunks
    const shape = metadata.metadata[`${variable}/.zarray`].shape
    const dimensions =
      metadata.metadata[`${variable}/.zattrs`]['_ARRAY_DIMENSIONS']
    const chunks = getChunkShapeOverride(
      nativeChunks,
      shape,
      dimensions,
      cfAxes[variable]
    )

    if (chunks) {
      result[variable] = chunks
    }
  })

  return result
}

const getChunksHeader = (metadata, variables, cfAxes) => {
  const chunks = getChunksOverrides(metadata, variables, cfAxes)
  return new Headers(
    Object.keys(chunks).map((key) => [
      'chunks',
      `${key}=${chunks[key].join(',')}`,
    ])
  )
}

export const getArrays = async (
  level,
  { url, metadata, variables, cfAxes, pyramid }
) => {
  // TODO: instantiate store with headers and clean up manual overrides
  const headers = pyramid ? {} : getChunksHeader(metadata, variables, cfAxes)
  const chunksOverrides = pyramid
    ? {}
    : getChunksOverrides(metadata, variables, cfAxes)

  // TODO: validate that we can reuse compressors across the store
  const compressorId =
    metadata.metadata[`${level ? `${level}/` : ''}${variables[0]}/.zarray`]
      .compressor?.id

  if (compressorId) {
    const compressor = COMPRESSORS[compressorId]
    if (!compressor) {
      throw new Error(`no compressor found for compressor.id=${compressorId}`)
    }
    zarr.registry.set(compressor.codecId, () => compressor)
  }

  const store = new FetchStore(url)

  const coords = new Set(
    variables.flatMap(
      (variable) =>
        metadata.metadata[`${level ? `${level}/` : ''}${variable}/.zattrs`][
          '_ARRAY_DIMENSIONS'
        ]
    )
  )

  const result = [...variables, ...coords].reduce((accum, arrayName) => {
    accum[arrayName] = null
    return accum
  }, {})
  const keys = Object.keys(result)

  const arrs = await Promise.all(
    keys.map((arrayName) =>
      zarr.get_array(store, `${level ? `/${level}` : ''}/${arrayName}`)
    )
  )
  keys.forEach((key, i) => {
    const arr = arrs[i]
    // TODO: remove if store can be instantiated with headers
    if (chunksOverrides[key]) arr.chunk_shape = chunksOverrides[key]

    // TODO: remove when pyramid spatial coordinates are no longer renamed
    let arrayKey = key
    if (pyramid && ['x', 'y'].includes(key)) {
      arrayKey = cfAxes[variables[0]][key.toLocaleUpperCase()]
    }
    result[arrayKey] = arr
  })

  return { arrays: result, headers }
}

export const getVariableLevelInfo = async (
  name,
  { level, arrays, headers },
  { cfAxes, metadata }
) => {
  const dataArray = arrays[name]
  const prefix = level ? `${level}/` : ''
  const zattrs = metadata.metadata[`${prefix}${name}/.zattrs`]
  const nullValue = getNullValue(dataArray)
  const gridMapping = zattrs.grid_mapping
    ? metadata.metadata[`${zattrs.grid_mapping}/.zattrs`]
    : null

  const { chunk_separator, chunk_shape, shape } = dataArray

  const dimensions = zattrs['_ARRAY_DIMENSIONS']
  const coordinates = await Promise.all(
    ['X', 'Y']
      .map((axis) => arrays[cfAxes[name][axis]])
      // TODO: handle chunked spatial coordinates
      .map((arr, i) => arr.get_chunk([0], { headers }))
  )

  const axes = ['X', 'Y'].reduce((accum, key, i) => {
    const index = dimensions.indexOf(cfAxes[name][key])
    const array = coordinates[i]
    const step = Math.abs(Number(array.data[0]) - Number(array.data[1]))
    const reversed = array.data[0] > array.data[array.data.length - 1]

    return {
      ...accum,
      [key]: { array, step, index, reversed },
    }
  }, {})

  const lockZoom = [axes.X.index, axes.Y.index].some(
    (index) => arrays[name].shape[index] / arrays[name].chunk_shape[index] > 4
  )

  return {
    centerPoint: [
      axes.X.array.data[Math.round((axes.X.array.data.length - 1) / 2)],
      axes.Y.array.data[Math.round((axes.Y.array.data.length - 1) / 2)],
    ],
    northPole:
      gridMapping &&
      gridMapping.hasOwnProperty('grid_north_pole_longitude') &&
      gridMapping.hasOwnProperty('grid_north_pole_latitude')
        ? [
            gridMapping.grid_north_pole_longitude,
            gridMapping.grid_north_pole_latitude,
          ]
        : undefined,
    axes,
    lockZoom,
    chunk_separator,
    chunk_shape,
    nullValue,
    shape,
    array: dataArray,
  }
}

export const getVariableInfo = async (
  name,
  { arrays, headers },
  { metadata, cfAxes, pyramid }
) => {
  const prefix = pyramid ? '0/' : ''
  const zattrs = metadata.metadata[`${prefix}${name}/.zattrs`]
  const dimensions = zattrs['_ARRAY_DIMENSIONS']

  const isSpatialDimension = (d) => {
    if ([cfAxes[name].X, cfAxes[name].Y].includes(d)) {
      return true
    } else if (pyramid && ['x', 'y', 'lat', 'lon'].includes(d)) {
      // TODO: remove when pyramid spatial coordinates are no longer renamed
      return true
    }
  }

  const selectorCoordinates = await Promise.all(
    dimensions
      .map((coord) => arrays[coord])
      .map((arr, i) =>
        isSpatialDimension(dimensions[i])
          ? null
          : // TODO: handle chunked coordinate arrays
            arr.get_chunk([0], { headers })
      )
  )

  const selectors = dimensions.map((d, i) => {
    const spatial = isSpatialDimension(d)
    const array = selectorCoordinates[i]

    return {
      name: d,
      chunk: spatial ? null : 0,
      index: spatial ? null : 0,
      value: array && array[0],
      metadata: {
        array,
        zattrs: metadata.metadata[`${prefix}${d}/.zattrs`],
        cfAxis: Object.keys(cfAxes[name]).find(
          (key) => cfAxes[name][key] === d
        ),
      },
    }
  })

  return {
    selectors,
  }
}

export const getChunkData = async (chunkKey, level) => {
  const { array, axes, nullValue, chunk_separator, chunk_shape, shape } =
    level.variable
  const chunkKeyArray = toKeyArray(chunkKey, { chunk_separator })
  const data = await array
    .get_chunk(chunkKeyArray, { headers: level.headers })
    .then((c) => {
      return ndarray(Float32Array.from(c.data, Number), chunk_shape)
    })

  const clim = getRange(data.data, { nullValue })

  const filteredData = filterData(chunkKey, data, {
    chunk_separator,
    chunk_shape,
    shape,
  })

  const { X, Y } = axes

  const steps = filteredData.shape.map((c, i) => {
    if (X.reversed && i === X.index) {
      return -1
    } else if (Y.reversed && i === Y.index) {
      return -1
    } else {
      return 1
    }
  })

  const normalizedData = filteredData.step(...steps)

  // TODO: only perform bound calculation for spatial dimensions
  const { X: lonRange, Y: latRange } = getChunkBounds(chunkKeyArray, {
    axes,
    chunk_shape,
  })
  const bounds = {
    lat: latRange,
    lon: lonRange,
  }

  return { data: normalizedData, clim, bounds }
}

export const getMapProps = (bounds, projection, skipMeridianFix) => {
  const f = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [
        [bounds.lon[0], bounds.lat[0]],
        [bounds.lon[1], bounds.lat[1]],
      ],
    },
  }

  const aspect = ASPECTS[projection]
  const p = PROJECTIONS[projection]().fitSize([Math.PI * 2, Math.PI], f)
  const translate = [
    p.translate()[0] / Math.PI - 1,
    ((1 / aspect) * p.translate()[1]) / Math.PI - 1,
  ]
  let scale = p.scale()
  const spansMeridian = bounds.lon[0] < 180 && bounds.lon[1] > 180

  if (spansMeridian && !skipMeridianFix) {
    const lonDiff = 180 - bounds.lon[0] + bounds.lon[1] - 180
    scale = getMapProps(
      { lon: [0, lonDiff], lat: bounds.lat },
      projection,
      true
    ).scale
  }

  return { scale, translate, projection: PROJECTIONS[projection] }
}

export const getProjection = ({ projection, scale, translate }) => {
  const p = projection()
  p.scale((scale * 800) / (2 * Math.PI))
  p.translate([
    ((1 + translate[0]) * 800) / 2,
    ((1 + translate[1]) * ASPECTS[p.id] * 800) / 2,
  ])

  return p
}

export const getAdjacentChunk = (offset, chunkKey, variable) => {
  const { axes, chunk_shape, shape, chunk_separator } = variable
  const [horizontalOffset, verticalOffset] = offset

  const coordinateOffset = shape.map((d, i) => {
    if (axes.X.index === i) {
      return horizontalOffset
    } else if (axes.Y.index === i) {
      return verticalOffset
    } else {
      return 0
    }
  })

  const chunkKeyArray = toKeyArray(chunkKey, { chunk_separator })
  const newChunkKeyArray = chunkKeyArray.map((d, i) => {
    let value = d + coordinateOffset[i]
    const numChunks = Math.ceil(shape[i] / chunk_shape[i])
    if (value > numChunks - 1) {
      value = value % numChunks
    } else if (value < 0) {
      value = value + numChunks
    }

    return value
  })

  // if new chunk key corresponds to array indices outside of the range represented
  // by `shape`, return null
  if (
    newChunkKeyArray.some(
      (d, i) => d * chunk_shape[i] < 0 || d * chunk_shape[i] >= shape[i]
    )
  ) {
    return null
  } else {
    return toKeyString(newChunkKeyArray, { chunk_separator })
  }
}

export const getActiveChunkKeys = (chunkKey, variable) => {
  const values = [
    [-2, -1],
    [-1, -1],
    [0, -1],
    [1, -1],
    [2, -1],
    [-2, 0],
    [-1, 0],
    [0, 0],
    [1, 0],
    [2, 0],
    [-2, 1],
    [-1, 1],
    [0, 1],
    [1, 1],
    [2, 1],
  ]
    .map((offset) => getAdjacentChunk(offset, chunkKey, variable))
    .filter(Boolean)

  return Array.from(new Set(values))
}

export const getClim = async (activeChunkKeys, { chunks, level }) => {
  const activeChunks = {}
  const allChunks = await Promise.all(
    activeChunkKeys.map(async (key) => {
      if (chunks[key]) {
        activeChunks[key] = chunks[key]
        return chunks[key]
      } else {
        const chunk = await getChunkData(key, level)
        activeChunks[key] = chunk
        return chunk
      }
    })
  )

  const combinedClim = allChunks.reduce(
    (prev, { clim: [min, max] }) => [
      Math.min(min, prev[0]),
      Math.max(max, prev[1]),
    ],
    [Infinity, -Infinity]
  )

  return {
    clim: combinedClim,
    chunks: activeChunks,
  }
}

const filterData = (
  chunkKey,
  data,
  { chunk_separator, chunk_shape, shape }
) => {
  const indices = chunkKey.split(chunk_separator).map(Number)

  const truncatedShape = indices.map((index, i) => {
    const impliedShape = (index + 1) * chunk_shape[i]
    if (impliedShape > shape[i]) {
      return shape[i] % chunk_shape[i]
    } else {
      return chunk_shape[i]
    }
  })

  if (truncatedShape.some((d, i) => d !== shape[i])) {
    return ndarray(Float32Array.from(data.data, Number), truncatedShape)
  } else {
    return data
  }
}

export const pointToChunkKey = (
  [lon, lat],
  { selectors, variable: { axes, chunk_separator, chunk_shape, shape } }
) => {
  const chunkKey = shape.map((d, i) => {
    if (axes.X.index === i) {
      return getAxisIndex(lon, {
        name: 'lon',
        axis: axes.X,
        chunk_shape,
        shape,
      })
    } else if (axes.Y.index === i) {
      return getAxisIndex(lat, {
        name: 'lat',
        axis: axes.Y,
        chunk_shape,
        shape,
      })
    } else {
      return selectors[i].chunk
    }
  })

  if (chunkKey.every((d) => d >= 0)) {
    return toKeyString(chunkKey, { chunk_separator })
  }
}

const inLonRange = (lon, range) => {
  if (range[0] <= lon && range[1] >= lon) {
    return true
  } else if (range[0] - 360 <= lon && range[1] - 360 >= lon) {
    return true
  }

  return false
}

const getLonDiff = (lon, range) => {
  if (range[0] <= lon && range[1] >= lon) {
    return lon - range[0]
  } else if (range[0] - 360 <= lon && range[1] - 360 >= lon) {
    return lon - range[0] + 360
  }

  throw new Error(
    `Incompatible longitude and range, lon: ${lon}; range: ${range.join(', ')}`
  )
}

const inBounds = (point, bounds) => {
  const [lon, lat] = point

  return (
    inLonRange(lon, bounds.lon) && bounds.lat[0] <= lat && bounds.lat[1] >= lat
  )
}

const getAxisIndex = (value, { name, axis, chunk_shape, shape }) => {
  const { array, index } = axis
  const start = array.data[0]
  const end = array.data[array.data.length - 1]

  let diff
  if (name === 'lon') {
    // if value is outside range,
    if (!inLonRange(value, [start, end])) {
      // return first index
      return 0
    }
    diff = getLonDiff(value, [start, end])
  } else {
    // if value is outside range,
    if ((value < start && value < end) || (value > start && value > end)) {
      // return whichever side of range is closer to value.
      return Math.abs(start - value) < Math.abs(end - value)
        ? 0
        : Math.ceil(shape / chunk_shape)
    }
    diff = value - start
  }

  const chunkStep = axis.step * chunk_shape[index]

  return diff < 0 ? Math.ceil(diff / chunkStep) : Math.floor(diff / chunkStep)
}

const radians = (deg) => (deg * Math.PI) / 180
const degrees = (rad) => (rad * 180) / Math.PI

// TODO: debug issues with rotation
const rotate = (coords, phi, theta) => {
  const lon = radians(coords[0])
  const lat = radians(coords[1])

  // Convert from spherical to cartesian coordinates
  const unrotatedCoord = [
    Math.cos(lon) * Math.cos(lat),
    Math.sin(lon) * Math.cos(lat),
    Math.sin(lat),
  ]

  // From https://en.wikipedia.org/wiki/Rotation_matrix#General_rotations
  const intrinsicRotation = [
    [
      Math.cos(phi) * Math.cos(theta),
      -1 * Math.sin(phi),
      Math.cos(phi) * Math.sin(theta),
    ],
    [
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    ],
    [-1.0 * Math.sin(theta), 0, Math.cos(theta)],
  ]

  const rotatedCoord = [
    intrinsicRotation[0][0] * unrotatedCoord[0] +
      intrinsicRotation[0][1] * unrotatedCoord[1] +
      intrinsicRotation[0][2] * unrotatedCoord[2],
    intrinsicRotation[1][0] * unrotatedCoord[0] +
      intrinsicRotation[1][1] * unrotatedCoord[1] +
      intrinsicRotation[1][2] * unrotatedCoord[2],
    intrinsicRotation[2][0] * unrotatedCoord[0] +
      intrinsicRotation[2][1] * unrotatedCoord[1] +
      intrinsicRotation[2][2] * unrotatedCoord[2],
  ]

  // Convert from cartesian to spherical coordinates
  const rotatedLon = degrees(Math.atan2(rotatedCoord[1], rotatedCoord[0]))
  const rotatedLat = degrees(Math.asin(rotatedCoord[2]))

  return [rotatedLon, rotatedLat]
}

const rotateCoords = (coords, northPole) => {
  const phiOffset = northPole[1] == 90 ? 0 : 180
  const phi = radians(phiOffset + northPole[0])
  const theta = radians(-1 * (90 - northPole[1]))

  return rotate(coords, phi, theta)
}

const unrotateCoords = (coords, northPole) => {
  const phiOffset = northPole[1] == 90 ? 0 : 180
  const phi = -1 * radians(phiOffset + northPole[0])
  const theta = -1 * radians(-1 * (90 - northPole[1]))

  return rotate(coords, phi, theta)
}

// TODO: avoid returning data when chunk is not yet present in `chunks`
// TODO: handle circular areas
//       - handle non-equal area pixels in aggregation
export const getLines = (
  center,
  selector,
  { activeChunkKeys, chunks, variable, selectors }
) => {
  const { chunk_separator, axes, chunk_shape, northPole } = variable
  const result = { coords: [], points: [], range: [Infinity, -Infinity] }

  const unrotatedCenter = northPole ? unrotateCoords(center, northPole) : center
  const selectedChunks = activeChunkKeys.filter(
    (c) => chunks[c] && inBounds(unrotatedCenter, chunks[c].bounds)
  )

  selectedChunks.forEach((chunkKey) => {
    const chunkKeyArray = toKeyArray(chunkKey, { chunk_separator })
    const { clim, bounds, data } = chunks[chunkKey]
    result.range = [
      Math.min(result.range[0], clim[0]),
      Math.max(result.range[1], clim[1]),
    ]

    const spatialIndices = [
      {
        axis: axes.X,
        diff: getLonDiff(unrotatedCenter[0], bounds.lon),
      },
      {
        axis: axes.Y,
        diff: unrotatedCenter[1] - bounds.lat[0],
      },
    ].map(({ axis, diff }) => {
      const { step } = axis

      return Math.round(diff / step - 1 / 2)
    })

    const indices = selectors.map((s, i) => {
      if (s.name === selector.name) {
        // return all values for selector being plotted
        return null
      } else if (i === axes.X.index) {
        // return selected index for X dimensions
        return spatialIndices[0]
      } else if (i === axes.Y.index) {
        // return selected index for Y dimension
        return spatialIndices[1]
      } else {
        // return displayed index for all other dimensions
        return selectors[i].index
      }
    })

    const values = indices.every((i) => typeof i === 'number')
      ? data.get(...indices)
      : unpack(data.pick(...indices))
    result.points.push(values)

    let coords = [
      axes.X.array.data[
        chunk_shape[axes.X.index] * chunkKeyArray[axes.X.index] +
          spatialIndices[0]
      ],
      axes.Y.array.data[
        chunk_shape[axes.Y.index] * chunkKeyArray[axes.Y.index] +
          spatialIndices[1]
      ],
    ]
    coords = northPole ? rotateCoords(coords, northPole) : coords

    result.coords.push(coords)
  })
  return result
}

export const validatePoint = ([lon, lat]) => {
  if (!inLonRange(lon, [-180, 180])) {
    return false
  } else if (lat > 90 || lat < -90) {
    return false
  }

  return true
}

// Infer axes from consolidated metadata
const inferCfAxes = (metadata, pyramid) => {
  const prefix = pyramid ? '0/' : ''
  const suffix = '/.zattrs'

  return Object.keys(metadata)
    .map((k) => {
      if (!k.endsWith(suffix)) {
        return false
      }

      if (prefix && !k.startsWith(prefix)) {
        return false
      }

      const variable = k.replace(prefix, '').replace(suffix, '')

      if (!variable) {
        return false
      }

      const dims = metadata[k]['_ARRAY_DIMENSIONS']
      if (!dims) {
        return false
      }

      const time = dims.find(
        (dim) => metadata[`${prefix}${dim}${suffix}`]?.calendar
      )
      const base = { variable, ...(time ? { T: time } : {}) }
      if (['x', 'y'].every((d) => dims.includes(d))) {
        return { ...base, X: 'x', Y: 'y' }
      } else if (['lat', 'lon'].every((d) => dims.includes(d))) {
        return { ...base, X: 'lon', Y: 'lat' }
      } else if (!pyramid && ['rlat', 'rlon'].every((d) => dims.includes(d))) {
        // For non-pyramids, also check for rotated X/Y coordinate names
        return { ...base, X: 'rlon', Y: 'rlat' }
      }
    })
    .filter(Boolean)
    .reduce((accum, { variable: v, ...rest }) => {
      accum[v] = rest
      return accum
    }, {})
}

export const inspectDataset = async (url) => {
  // fetch zmetadata to figure out compression and variables
  const sanitized = sanitizeUrl(url)

  let response
  try {
    response = await fetch(`${sanitized}/.zmetadata`)
  } catch (e) {
    // Show generic error message when request fails before response can be inspected.
    throw new Error(
      'A network error occurred. This could be a CORS issue or a dropped internet connection.'
    )
  }

  if (!response.ok) {
    const statusText = response.statusText ?? 'Dataset request failed.'
    if (response.status === 403) {
      throw new Error(
        `STATUS 403: Access forbidden. Ensure that URL is correct and that dataset is publicly accessible.`
      )
    } else if (response.status === 404) {
      throw new Error(
        `STATUS 404: ${statusText} Ensure that URL path is correct.`
      )
    } else {
      throw new Error(
        `STATUS ${response.status}: ${statusText}. URL: ${sanitized}`
      )
    }
  }
  const metadata = await response.json()

  if (!metadata.metadata) {
    throw new Error(metadata?.message || 'Unable to parse metadata')
  }

  const multiscales = metadata.metadata['.zattrs']['multiscales']
  let cf_axes = metadata.metadata['.zattrs']['ncviewjs:cf_axes']
  const rechunking = metadata.metadata['.zattrs']['ncviewjs:rechunking'] ?? []

  let pyramid = false
  let visualizedUrl = sanitized

  if (multiscales) {
    pyramid = true
  } else if (rechunking && rechunking.length > 0) {
    const pyramidRechunked = rechunking.find(
      (r) => r.use_case === 'multiscales'
    )
    if (pyramidRechunked) {
      pyramid = true
      visualizedUrl = pyramidRechunked.path
      const { cf_axes: pyramidCfAxes } = await inspectDataset(visualizedUrl)
      cf_axes ||= pyramidCfAxes
    }
  }

  cf_axes ||= inferCfAxes(metadata.metadata, pyramid)
  if (!cf_axes || Object.keys(cf_axes).length === 0) {
    throw new Error(
      'No CF axes information provided and unable to infer from metadata.'
    )
  }

  return { url: visualizedUrl, cf_axes, metadata, pyramid }
}
