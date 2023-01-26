import * as zarr from 'zarrita/v2'
import FetchStore from 'zarrita/storage/fetch'
import { get } from 'zarrita/ndarray'
import ndarray from 'ndarray'
import concatColumns from 'ndarray-concat-cols'
import concatRows from 'ndarray-concat-rows'

import { Blosc, GZip, Zlib, LZ4, Zstd } from 'numcodecs'
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

const toKeyString = (chunkKeyArray, { variable, arrays }) => {
  if (chunkKeyArray.length === 0) {
    return ''
  }

  return chunkKeyArray.join(arrays[variable].chunk_separator)
}
const toKeyArray = (chunkKey, { variable, arrays }) => {
  if (chunkKey.length === 0) {
    return []
  }

  return chunkKey.split(arrays[variable].chunk_separator).map(Number)
}

const getCenterChunk = ({ arrays, variable }) => {
  const { chunk_shape, shape } = arrays[variable]

  return shape.map((d, i) => Math.floor(d / chunk_shape[i] / 2))
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
    .filter((d) => metadata.metadata[`${d}/.zarray`].shape.length === 2) // TODO: update to `>= 2` once non-spatial dimensions are supported
    .filter((d) =>
      metadata.metadata[`${d}/.zattrs`]['_ARRAY_DIMENSIONS'].every(
        (dim) => metadata.metadata[`${dim}/.zarray`]
      )
    )

  return { metadata, variables }
}

const COMPRESSORS = {
  zlib: Zlib,
  blosc: Blosc,
}

const getChunkShapeOverride = (chunkShape) => {
  if (chunkShape.length === 1 || chunkShape.every((d) => d <= 256)) {
    return null
  }
  return chunkShape.map((d) => Math.min(d, 256))
}

export const getArrays = async (url, metadata, variables) => {
  // TODO: validate that we can reuse compressors across the store
  const compressorId =
    metadata.metadata[`${variables[0]}/.zarray`].compressor.id
  const compressor = COMPRESSORS[compressorId]
  if (!compressor) {
    throw new Error(`no compressor found for compressor.id=${compressorId}`)
  }

  zarr.registry.set(compressor.codecId, () => compressor)
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
    const override = getChunkShapeOverride(arr.chunk_shape)
    if (override) arr.chunk_shape = override

    result[key] = arrs[i]
  })

  return result
}

export const getVariableInfo = async (
  variable,
  { arrays, metadata, apiMetadata }
) => {
  const dataArray = arrays[variable]
  const chunkKeyArray = getCenterChunk({ arrays, variable })
  const zattrs = metadata.metadata[`${variable}/.zattrs`]
  const zarray = metadata.metadata[`${variable}/.zarray`]

  const gridMapping = zattrs.grid_mapping
    ? metadata.metadata[`${zattrs.grid_mapping}/.zattrs`]
    : null
  const dimensions = zattrs['_ARRAY_DIMENSIONS']
  const coordinates = await Promise.all(
    dimensions.map((coord) => arrays[coord]).map((arr) => get(arr))
  )

  const nullValue = getNullValue(dataArray)

  const axes = Object.keys(apiMetadata[variable]).reduce((accum, key) => {
    const index = dimensions.indexOf(apiMetadata[variable][key])

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

  return {
    chunkKey: toKeyString(chunkKeyArray, { arrays, variable }),
    nullValue,
    northPole: gridMapping
      ? [
          gridMapping.grid_north_pole_longitude,
          gridMapping.grid_north_pole_latitude,
        ]
      : undefined,
    axes,
    bounds,
    lockZoom,
  }
}

const getChunkData = async (
  chunkKey,
  { arrays, variable: { axes, name: variable, nullValue } }
) => {
  const dataArray = arrays[variable]
  const chunkKeyArray = toKeyArray(chunkKey, { arrays, variable })
  const data = await dataArray
    .get_chunk(chunkKeyArray, {
      headers: {
        chunks: dataArray.chunk_shape.join(','),
      },
    })
    .then((c) => ndarray(new Float32Array(c.data), dataArray.chunk_shape))

  const clim = getRange(data.data, { nullValue })

  const filteredData = filterData(chunkKey, data, {
    arrays,
    variable,
  })

  let normalizedData = ndarray(
    new Float32Array(filteredData.data),
    filteredData.shape
  )

  const {
    X: { array: lon },
    Y: { array: lat },
  } = axes

  const latsReversed = lat.data[0] > lat.data[lat.data.length - 1]
  const lonsReversed = lon.data[0] > lon.data[lon.data.length - 1]

  // TODO: handle extra dimensions
  if (latsReversed || lonsReversed) {
    for (let i = 0; i < filteredData.shape[0]; i++) {
      for (let j = 0; j < filteredData.shape[1]; j++) {
        normalizedData.set(
          i,
          j,
          filteredData.get(
            latsReversed ? filteredData.shape[0] - 1 - i : i,
            lonsReversed ? filteredData.shape[1] - 1 - j : j
          )
        )
      }
    }
  }

  const { X: lonRange, Y: latRange } = getChunkBounds(chunkKeyArray, {
    axes,
    chunk_shape: dataArray.chunk_shape,
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

export const getAdjacentChunk = (
  offset,
  { arrays, axes, variable, chunkKey, chunk, shape }
) => {
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

  const chunkKeyArray = toKeyArray(chunkKey, { arrays, variable })
  const newChunkKeyArray = chunkKeyArray.map((d, i) => d + coordinateOffset[i])

  // if new chunk key corresponds to array indices outside of the range represented
  // by `shape`, return null
  if (
    newChunkKeyArray.some(
      (d, i) => d * chunk[i] < 0 || d * chunk[i] >= shape[i]
    )
  ) {
    return null
  } else {
    return toKeyString(newChunkKeyArray, { arrays, variable })
  }
}

const getActiveChunkKeys = (chunkKey, { axes, arrays, variable }) => {
  const { chunk_shape, shape } = arrays[variable]

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
    .map((offset) =>
      getAdjacentChunk(offset, {
        axes,
        arrays,
        variable,
        chunkKey,
        chunk: chunk_shape,
        shape,
      })
    )
    .filter(Boolean)
}
export const getAllData = async (
  chunkKey,
  { arrays, chunks, variable: { axes, name: variable, nullValue } }
) => {
  const activeChunkKeys = getActiveChunkKeys(chunkKey, {
    axes,
    arrays,
    variable,
  })
  const activeChunks = {}
  const allChunks = await Promise.all(
    activeChunkKeys.map(async (key) => {
      if (chunks[key]) {
        activeChunks[key] = chunks[key]
        return chunks[key]
      } else {
        const chunk = await getChunkData(key, {
          arrays,
          variable: { axes, name: variable, nullValue },
        })
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

  const separator = arrays[variable].chunk_separator
  // stitch together chunks in order dictated by chunk keys
  // TODO: handle empty chunks https://zarr.readthedocs.io/en/stable/tutorial.html#empty-chunks (i.e. non-continuous chunks)

  const { X, Y } = axes
  const [xReversed, yReversed] = [
    X.array.data[0] < X.array.data[X.array.data.length - 1],
    Y.array.data[0] < Y.array.data[Y.array.data.length - 1],
  ]

  const data = activeChunkKeys
    // sort by columns
    .sort(
      (a, b) =>
        (xReversed ? 1 : -1) *
        (Number(a.split(separator)[X.index]) -
          Number(b.split(separator)[X.index]))
    )
    // sort by rows
    .sort(
      (a, b) =>
        (yReversed ? 1 : -1) *
        (Number(a.split(separator)[Y.index]) -
          Number(b.split(separator)[Y.index]))
    )
    .reduce((rows, chunkKey) => {
      const rowNumber = chunkKey.split(separator)[Y.index]
      const row = rows.find((row) => rowNumber === row[0])
      const { data } = activeChunks[chunkKey]
      if (row) {
        row[1] = concatColumns([row[1], data], {
          dtype: 'float32',
        })
      } else {
        rows.push([rowNumber, data])
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

const filterData = (chunkKey, data, { arrays, variable }) => {
  const separator = arrays[variable].chunk_separator
  const indices = chunkKey.split(separator).map(Number)
  const { chunk_shape, shape } = arrays[variable]

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
  {
    arrays,
    variable: {
      name,
      // nullValue,
      // northPole,
      axes,
    },
  }
) => {
  const { chunk_shape, shape } = arrays[name]

  const chunkKey = shape.map((d, i) => {
    if (axes.X.index === i) {
      return getAxisIndex(lon, { axis: axes.X, chunk_shape, shape })
    } else if (axes.Y.index === i) {
      return getAxisIndex(lat, { axis: axes.Y, chunk_shape, shape })
    } else {
      // TODO: properly handle selected non-spatial dimension
      return 0
    }
  })

  if (chunkKey.every((d) => d >= 0)) {
    return toKeyString(chunkKey, { variable: name, arrays })
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
