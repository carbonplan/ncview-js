import * as zarr from 'zarrita/v2'
import FetchStore from 'zarrita/storage/fetch'
import ndarray from 'ndarray'
import {
  Blosc,
  //GZip,
  Zlib,
  // LZ4,
  // Zstd,
} from 'numcodecs'
import { deviation } from 'd3-array'
import { PROJECTIONS, ASPECTS } from '../constants'

const COMPRESSORS = {
  zlib: Zlib,
  blosc: Blosc,
}

const MAX_ARRAY_LENGTH = 1000000

const calculateRange = (arr, { nullValue }) => {
  const filteredData = arr.filter((d) => !Number.isNaN(d) && d !== nullValue)
  if (filteredData.length < 2) {
    return [Infinity, -Infinity]
  }

  // Step 1: Sort the data
  const sortedData = filteredData.sort((a, b) => a - b)

  // Step 2: Helper function to calculate the nth percentile
  function getPercentile(n) {
    const index = (n / 100) * (sortedData.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1

    if (upper >= sortedData.length) upper = sortedData.length - 1 // Cap the index to the maximum array length

    return (
      Number(sortedData[lower]) * (1 - weight) +
      Number(sortedData[upper]) * weight
    )
  }

  // Calculate 5th and 95th percentiles
  const min = getPercentile(5)
  const max = getPercentile(95)

  return [min, max]
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

const isArrayOverSizeLimit = (dimensions) => {
  return dimensions.reduce((product, d) => product * d, 1) >= MAX_ARRAY_LENGTH
}

const getChunkShapeOverride = (chunkShape, shape, dimensions, axes) => {
  if (chunkShape.length === 1) {
    return null
  }

  const fullSpace =
    dimensions
      .filter((d) => [axes?.X, axes?.Y].includes(d))
      .every((d) => d <= 360) && !isArrayOverSizeLimit(chunkShape)

  return dimensions.map((d, i) => {
    if ([axes?.X, axes?.Y].includes(d)) {
      return fullSpace ? chunkShape[i] : Math.min(128, chunkShape[i])
    } else if (d === axes?.T) {
      return Math.min(30, chunkShape[i])
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
    if (metadata.metadata[`${coordinate}/.zarray`]) {
      const { shape, chunks } = metadata.metadata[`${coordinate}/.zarray`]

      if (shape.some((d, i) => d !== chunks[i])) {
        result[coordinate] = shape
      }
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

const getChunksHeaders = (metadata, variables, cfAxes) => {
  const headerMapping = variables.reduce((accum, variable) => {
    const chunks = getChunksOverrides(metadata, [variable], cfAxes)
    accum[variable] = new Headers(
      Object.keys(chunks).map((key) => [
        'chunks',
        `${key}=${chunks[key].join(',')}`,
      ])
    )
    return accum
  }, {})

  return headerMapping
}

export const getArrays = async (
  level,
  { url, metadata, variables, cfAxes, pyramid }
) => {
  // TODO: instantiate store with headers and clean up manual overrides

  const headers = pyramid ? {} : getChunksHeaders(metadata, variables, cfAxes)
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

  const result = [...variables, ...coords]
    .filter(
      (arrayName) =>
        metadata.metadata[`${level ? `${level}/` : ''}${arrayName}/.zarray`]
    )
    .reduce((accum, arrayName) => {
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
  { cfAxes, metadata, pyramid }
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
      .map((arr, i) =>
        arr
          .get_chunk([0], { headers: headers[name] })
          .then((c) =>
            ndarray(Float32Array.from(c.data, Number), arr.chunk_shape)
          )
      )
  )

  const axes = ['X', 'Y'].reduce((accum, key, i) => {
    const index = dimensions.indexOf(cfAxes[name][key])
    const array = coordinates[i]
    if (!pyramid) {
      const stepValues = array.data.reduce((a, d, i) => {
        if (i === 0) return a
        const delta = d - array.data[i - 1]
        a.add(delta)
        return a
      }, new Set())
      const stepDeviation = deviation(stepValues)
      if (stepDeviation && stepDeviation > 1e-3) {
        throw new Error(
          `Cannot handle coordinate: ${cfAxes[name][key]}. Spatial coordinates must be equally spaced.`
        )
      }
    }

    const step = Math.abs(Number(array.data[0]) - Number(array.data[1]))
    const reversed = array.data[0] > array.data[array.data.length - 1]

    return {
      ...accum,
      [key]: { array, step, index, reversed },
    }
  }, {})

  const centerPoint = [
    axes.X.array.data[Math.round((axes.X.array.data.length - 1) / 2)],
    axes.Y.array.data[Math.round((axes.Y.array.data.length - 1) / 2)],
  ]

  if (!pyramid) {
    const unhandledCoords = [
      [
        axes.X.array.data[0],
        axes.X.array.data[axes.X.array.data.length - 1],
      ].some((el) => Math.abs(el) > 360)
        ? cfAxes[name].X
        : null,
      [
        axes.Y.array.data[0],
        axes.Y.array.data[axes.Y.array.data.length - 1],
      ].some((el) => Math.abs(el) > 180)
        ? cfAxes[name].Y
        : null,
    ].filter(Boolean)

    if (unhandledCoords.length > 0) {
      throw new Error(
        `Cannot handle coordinate${
          unhandledCoords.length > 1 ? 's' : ''
        }: ${unhandledCoords.join(
          ', '
        )}. Spatial coordinates must refer to latitude and longitude.`
      )
    }
  }

  return {
    centerPoint,
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
      .map((arr, i) => {
        if (
          isSpatialDimension(dimensions[i]) ||
          !arr ||
          isArrayOverSizeLimit(arr.shape)
        ) {
          return null
        } else {
          // TODO: handle chunked coordinate arrays
          return arr.get_chunk([0], { headers: headers[name] })
        }
      })
  )

  const selectors = dimensions.map((d, i) => {
    const spatial = isSpatialDimension(d)
    const array = selectorCoordinates[i]

    // Convert from UnicodeStringArray to basic Array object
    if (array?.data?.get) {
      array.data = Array(array.shape[0])
        .fill(null)
        .map((d, j) => array.data.get(j))
    }

    return {
      name: d,
      chunk: spatial ? null : 0,
      index: spatial ? null : 0,
      metadata: {
        array,
        dimensionIndex: i,
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
  const { array, axes, nullValue, chunk_separator, chunk_shape, shape, name } =
    level.variable
  const chunkKeyArray = toKeyArray(chunkKey, { chunk_separator })
  const data = await array
    .get_chunk(chunkKeyArray, { headers: level.headers[name] })
    .then((c) => {
      return ndarray(Float32Array.from(c.data, Number), chunk_shape)
    })

  const clim = calculateRange(data.data, { nullValue })

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

export const inLonRange = (lon, range) => {
  if (range[0] <= lon && range[1] >= lon) {
    return true
  } else if (range[0] - 360 <= lon && range[1] - 360 >= lon) {
    return true
  }

  return false
}

export const getLonDiff = (lon, range) => {
  if (range[0] <= lon && range[1] >= lon) {
    return lon - range[0]
  } else if (range[0] - 360 <= lon && range[1] - 360 >= lon) {
    return lon - range[0] + 360
  }

  throw new Error(
    `Incompatible longitude and range, lon: ${lon}; range: ${range.join(', ')}`
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

  return diff < 0
    ? Math.abs(Math.ceil(diff / chunkStep))
    : Math.floor(diff / chunkStep)
}

export const validatePoint = ([lon, lat]) => {
  if (!inLonRange(lon, [-180, 180])) {
    return false
  } else if (lat > 90 || lat < -90) {
    return false
  }

  return true
}

export const isNullValue = (p, variable) => {
  return p == null || p === variable.nullValue || Number.isNaN(p)
}
