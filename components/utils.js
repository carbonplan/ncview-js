import * as zarr from 'zarrita/v2'
import FetchStore from 'zarrita/storage/fetch'
import ndarray from 'ndarray'
import concatColumns from 'ndarray-concat-cols'
import concatRows from 'ndarray-concat-rows'

import { PROJECTIONS, ASPECTS } from './constants'

const getRange = (arr, { nullValue }) => {
  return arr
    .filter((d) => !Number.isNaN(d) && d !== nullValue && d !== -1000) // TODO: remove after demo
    .reduce(
      ([min, max], d) => [Math.min(min, d), Math.max(max, d)],
      [Infinity, -Infinity]
    )
}

const getBounds = (coord) => {
  return [coord.data[0], coord.data[coord.data.length - 1]].sort()
}

const getChunkBounds = (chunkKeyArray, { axes, chunk_shape }) => {
  return Object.keys(axes).reduce((accum, key) => {
    const { array, index } = axes[key]
    if (!array) {
      return accum
    }
    const start = chunkKeyArray[index] * chunk_shape[index]
    const end = start + chunk_shape[index] - 1

    return {
      ...accum,
      [key]: [
        array.data[start],
        array.data[Math.min(end, array.data.length - 1)],
      ].sort(),
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

const getCenterChunk = ({ chunk_shape, shape, selectors }) => {
  return shape.map(
    (d, i) => selectors[i].chunk ?? Math.floor(d / chunk_shape[i] / 2)
  )
}

export const getMetadata = async (url) => {
  // fetch zmetadata to figure out compression and variables
  const response = await fetch(`${url}/.zmetadata`)
  const metadata = await response.json()

  const variables = Object.keys(metadata.metadata)
    .map((k) => k.match(/\w+(?=\/\.zarray)/))
    .filter(Boolean)
    .map((a) => a[0])
    .filter((d) => !['lat', 'lon'].includes(d))
    .filter((d) => metadata.metadata[`${d}/.zarray`].shape.length >= 2)
    .filter((d) =>
      metadata.metadata[`${d}/.zattrs`]['_ARRAY_DIMENSIONS'].every(
        (dim) => metadata.metadata[`${dim}/.zarray`]
      )
    )

  return { metadata, variables }
}

const getChunkShapeOverride = (chunkShape, limits) => {
  if (chunkShape.length === 1 || chunkShape.every((d, i) => d <= limits[i])) {
    return null
  }
  return chunkShape.map((d, i) => Math.min(d, limits[i]))
}

const getChunksOverrides = (metadata, variables, apiMetadata) => {
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
    const dimensions =
      metadata.metadata[`${variable}/.zattrs`]['_ARRAY_DIMENSIONS']
    const limits = dimensions.map((d, i) =>
      [apiMetadata[variable].X, apiMetadata[variable].Y].includes(d) ? 256 : 30
    )
    const chunks = getChunkShapeOverride(nativeChunks, limits)

    if (chunks) {
      result[variable] = chunks
    }
  })

  return result
}

const getChunksHeader = (metadata, variables, apiMetadata) => {
  const chunks = getChunksOverrides(metadata, variables, apiMetadata)
  return new Headers(
    Object.keys(chunks).map((key) => [
      'chunks',
      `${key}=${chunks[key].join(',')}`,
    ])
  )
}

export const getArrays = async (url, metadata, variables, apiMetadata) => {
  // TODO: instantiate store with headers and clean up manual overrides
  const headers = getChunksHeader(metadata, variables, apiMetadata)
  const chunksOverrides = getChunksOverrides(metadata, variables, apiMetadata)

  const store = new FetchStore(url)

  const coords = new Set(
    variables.flatMap(
      (variable) =>
        metadata.metadata[`${variable}/.zattrs`]['_ARRAY_DIMENSIONS']
    )
  )

  const result = [...variables, ...coords].reduce((accum, arrayName) => {
    accum[arrayName] = null
    return accum
  }, {})
  const keys = Object.keys(result)

  const arrs = await Promise.all(
    keys.map((arrayName) => zarr.get_array(store, `/${arrayName}`))
  )
  keys.forEach((key, i) => {
    const arr = arrs[i]
    // TODO: remove if store can be instantiated with headers
    if (chunksOverrides[key]) arr.chunk_shape = chunksOverrides[key]

    result[key] = arr
  })

  return { arrays: result, headers }
}

export const getVariableInfo = async (
  name,
  { arrays, headers, metadata, apiMetadata }
) => {
  const dataArray = arrays[name]
  const zattrs = metadata.metadata[`${name}/.zattrs`]
  const zarray = metadata.metadata[`${name}/.zarray`]

  const gridMapping = zattrs.grid_mapping
    ? metadata.metadata[`${zattrs.grid_mapping}/.zattrs`]
    : null
  const dimensions = zattrs['_ARRAY_DIMENSIONS']
  const coordinates = await Promise.all(
    dimensions
      .map((coord) => arrays[coord])
      .map((arr, i) => arr.get_chunk([0], { headers }))
  )

  const nullValue = getNullValue(dataArray)
  const { chunk_separator, chunk_shape, shape } = dataArray

  const axes = Object.keys(apiMetadata[name]).reduce((accum, key) => {
    const index = dimensions.indexOf(apiMetadata[name][key])

    return {
      ...accum,
      [key]: { array: coordinates[index], index },
    }
  }, {})

  const bounds = {
    lon: getBounds(axes.X.array),
    lat: getBounds(axes.Y.array),
  }

  const lockZoom = [axes.X.index, axes.Y.index].some(
    (index) => zarray.shape[index] / zarray.chunks[index] > 4
  )

  const selectors = dimensions.map((d, i) => {
    const isSpatialDimension = [axes.X.index, axes.Y.index].includes(i)
    return {
      name: d,
      chunk: isSpatialDimension ? null : 0,
      index: isSpatialDimension ? null : 0,
    }
  })
  const chunkKeyArray = getCenterChunk({ chunk_shape, shape, selectors })

  return {
    chunkKey: toKeyString(chunkKeyArray, { chunk_separator }),
    northPole: gridMapping
      ? [
          gridMapping.grid_north_pole_longitude,
          gridMapping.grid_north_pole_latitude,
        ]
      : undefined,
    axes,
    bounds,
    lockZoom,
    selectors,
    nullValue,
    chunk_separator,
    chunk_shape,
    shape,
    array: dataArray,
  }
}

const getChunkData = async (
  chunkKey,
  {
    variable: { array, axes, nullValue, chunk_separator, chunk_shape, shape },
    headers,
  }
) => {
  const chunkKeyArray = toKeyArray(chunkKey, { chunk_separator })
  const data = await array
    .get_chunk(chunkKeyArray, { headers })
    .then((c) => ndarray(new Float32Array(c.data), chunk_shape))

  const clim = getRange(data.data, { nullValue })

  const filteredData = filterData(chunkKey, data, {
    chunk_separator,
    chunk_shape,
    shape,
  })

  const { X, Y } = axes
  const [xReversed, yReversed] = [
    X.array.data[0] > X.array.data[X.array.data.length - 1],
    Y.array.data[0] > Y.array.data[Y.array.data.length - 1],
  ]

  const steps = filteredData.shape.map((c, i) => {
    if (xReversed && i === X.index) {
      return -1
    } else if (yReversed && i === Y.index) {
      return -1
    } else {
      return 1
    }
  })

  const normalizedData = filteredData.step(...steps)

  const { X: lonRange, Y: latRange } = getChunkBounds(chunkKeyArray, {
    axes,
    chunk_shape: chunk_shape,
  })
  const bounds = {
    lat: latRange,
    lon: lonRange,
  }

  return { data: normalizedData, clim, bounds }
}

export const getMapProps = (bounds, projection) => {
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
  const scale = p.scale()
  const translate = [
    p.translate()[0] / Math.PI - 1,
    ((1 / aspect) * p.translate()[1]) / Math.PI - 1,
  ]

  return { scale, translate, projection: PROJECTIONS[projection] }
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
  const newChunkKeyArray = chunkKeyArray.map((d, i) => d + coordinateOffset[i])

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

const getActiveChunkKeys = (chunkKey, variable) => {
  return [
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
}
export const getAllData = async (chunkKey, { chunks, variable, headers }) => {
  const activeChunkKeys = getActiveChunkKeys(chunkKey, variable)
  const activeChunks = {}
  const allChunks = await Promise.all(
    activeChunkKeys.map(async (key) => {
      if (chunks[key]) {
        activeChunks[key] = chunks[key]
        return chunks[key]
      } else {
        const chunk = await getChunkData(key, { variable, headers })
        activeChunks[key] = chunk
        return chunk
      }
    })
  )

  const combinedBounds = allChunks.reduce(
    (prev, { bounds: { lat, lon } }) => ({
      lat: [
        Math.min(Math.min(...lat), prev.lat[0]),
        Math.max(Math.max(...lat), prev.lat[1]),
      ],
      lon: [
        Math.min(Math.min(...lon), prev.lon[0]),
        Math.max(Math.max(...lon), prev.lon[1]),
      ],
    }),
    { lat: [Infinity, -Infinity], lon: [Infinity, -Infinity] }
  )

  const combinedClim = allChunks.reduce(
    (prev, { clim: [min, max] }) => [
      Math.min(min, prev[0]),
      Math.max(max, prev[1]),
    ],
    [Infinity, -Infinity]
  )

  const { chunk_separator: separator, axes, selectors } = variable
  // stitch together chunks in order dictated by chunk keys
  // TODO: handle empty chunks https://zarr.readthedocs.io/en/stable/tutorial.html#empty-chunks (i.e. non-continuous chunks)

  const { X, Y } = axes
  const [xReversed, yReversed] = [
    X.array.data[0] > X.array.data[X.array.data.length - 1],
    Y.array.data[0] > Y.array.data[Y.array.data.length - 1],
  ]

  const data = activeChunkKeys
    // sort by columns
    .sort(
      (a, b) =>
        (xReversed ? -1 : 1) *
        (Number(a.split(separator)[X.index]) -
          Number(b.split(separator)[X.index]))
    )
    // sort by rows
    .sort(
      (a, b) =>
        (yReversed ? -1 : 1) *
        (Number(a.split(separator)[Y.index]) -
          Number(b.split(separator)[Y.index]))
    )
    .reduce((rows, chunkKey) => {
      const rowNumber = chunkKey.split(separator)[Y.index]
      const row = rows.find((row) => rowNumber === row[0])
      const { data } = activeChunks[chunkKey]
      const selectedData = data.pick(...selectors.map((d) => d.index))
      if (row) {
        row[1] = concatColumns([row[1], selectedData], {
          dtype: 'float32',
        })
      } else {
        rows.push([rowNumber, selectedData])
      }
      return rows
    }, [])
    .reduce((columns, column) => {
      if (!columns) {
        return column[1]
      } else {
        return concatRows([columns, column[1]], { dtype: 'float32' })
      }
    }, null)

  return {
    bounds: combinedBounds,
    clim: combinedClim,
    data,
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
    return ndarray(new Float32Array(data.data), truncatedShape)
  } else {
    return data
  }
}

export const pointToChunkKey = (
  [lon, lat],
  { selectors, axes, chunk_separator, chunk_shape, shape }
) => {
  const chunkKey = shape.map((d, i) => {
    if (axes.X.index === i) {
      return getAxisIndex(lon, { axis: axes.X, chunk_shape, shape })
    } else if (axes.Y.index === i) {
      return getAxisIndex(lat, { axis: axes.Y, chunk_shape, shape })
    } else {
      return selectors[i].chunk
    }
  })

  if (chunkKey.every((d) => d >= 0)) {
    return toKeyString(chunkKey, { chunk_separator })
  }
}

const getAxisIndex = (value, { axis, chunk_shape, shape }) => {
  const { array, index } = axis
  const start = array.data[0]
  const end = array.data[array.data.length - 1]

  // if value is outside range,
  if ((value < start && value < end) || (value > start && value > end)) {
    // return whichever side of range is closer to value.
    return Math.abs(start - value) < Math.abs(end - value)
      ? 0
      : Math.ceil(shape / chunk_shape)
  }

  const step = (end - start) / shape[index]
  const chunkStep = step * chunk_shape[index]

  return Math.floor((value - start) / chunkStep)
}
