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
    .filter((d) => !Number.isNaN(d) && d !== nullValue)
    .reduce(
      ([min, max], d) => [Math.min(min, d), Math.max(max, d)],
      [Infinity, -Infinity]
    )
}

const getBounds = (coordinates) => {
  return coordinates.map((coord) =>
    [coord.data[0], coord.data[coord.data.length - 1]].sort()
  )
}

const getChunkBounds = (chunkKeyArray, { coordinates, chunk }) => {
  return coordinates.map((coord, i) => {
    const start = chunkKeyArray[i] * chunk[i]
    const end = start + chunk[i] - 1
    return [
      coord.data[start],
      coord.data[Math.min(end, coord.data.length - 1)],
    ].sort()
  })
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
    .filter((d) => metadata.metadata[`${d}/.zarray`].shape.length >= 2)
    .filter((d) =>
      metadata.metadata[`${d}/.zattrs`]['_ARRAY_DIMENSIONS'].every(
        (dim) => metadata.metadata[`${dim}/.zarray`]
      )
    )

  const isChunked = variables.some((v) => {
    const zarray = metadata.metadata[`${v}/.zarray`]
    return zarray.chunks.some((d, i) => d !== zarray.shape[i])
  })

  return { metadata, variables, isChunked }
}

const COMPRESSORS = {
  zlib: Zlib,
  blosc: Blosc,
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
  keys.forEach((key, i) => (result[key] = arrs[i]))

  return result
}

export const getVariableInfo = async (variable, { arrays, metadata }) => {
  const dataArray = arrays[variable]
  const chunkKeyArray = getCenterChunk({ arrays, variable })
  const zattrs = metadata.metadata[`${variable}/.zattrs`]

  const gridMapping = zattrs.grid_mapping
    ? metadata.metadata[`${zattrs.grid_mapping}/.zattrs`]
    : null
  const coordArrays = zattrs['_ARRAY_DIMENSIONS'].map((coord) => arrays[coord])

  const coordinates = await Promise.all(coordArrays.map((arr) => get(arr)))

  const nullValue = getNullValue(dataArray)

  // TODO: remove assumption about lat, lon coordinate order
  const [latRange, lonRange] = getBounds(coordinates)
  const bounds = { lat: latRange, lon: lonRange }

  return {
    chunkKey: toKeyString(chunkKeyArray, { arrays, variable }),
    nullValue,
    northPole: gridMapping
      ? [
          gridMapping.grid_north_pole_longitude,
          gridMapping.grid_north_pole_latitude,
        ]
      : undefined,
    coordinates,
    bounds,
  }
}

export const getData = async (
  chunkKey,
  { arrays, variable: { coordinates, name: variable, nullValue } }
) => {
  const dataArray = arrays[variable]
  const chunkKeyArray = toKeyArray(chunkKey, { arrays, variable })
  const data = await dataArray
    .get_chunk(chunkKeyArray)
    .then((c) => ndarray(new Float32Array(c.data), c.shape))

  const clim = getRange(data.data, { nullValue })

  let normalizedData = ndarray(new Float32Array(data.data), data.shape)

  // TODO: remove assumption about lat, lon coordinate order
  const [lat, lon] = coordinates

  const latsReversed = lat.data[0] > lat.data[lat.data.length - 1]
  const lonsReversed = lon.data[0] > lon.data[lon.data.length - 1]

  if (latsReversed || lonsReversed) {
    normalizedData = ndarray(new Float32Array(Array(data.size)), data.shape)
    for (let i = 0; i < data.shape[0]; i++) {
      for (let j = 0; j < data.shape[1]; j++) {
        normalizedData.set(
          i,
          j,
          data.get(
            latsReversed ? data.shape[0] - 1 - i : i,
            lonsReversed ? data.shape[1] - 1 - j : j
          )
        )
      }
    }
  }

  // TODO: remove assumption about lat, lon coordinate order
  const [latRange, lonRange] = getChunkBounds(chunkKeyArray, {
    coordinates,
    chunk: dataArray.chunk_shape,
  })
  const bounds = { lat: latRange, lon: lonRange }

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

  return { scale, translate }
}

export const getAdjacentChunk = (
  offset,
  { arrays, variable, chunkKey, chunk, shape }
) => {
  const [horizontalOffset, verticalOffset] = offset

  // TODO: remove assumption about lat, lon coordinate order
  const coordinateOffset = [verticalOffset, horizontalOffset]

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

const getActiveChunkKeys = (chunkKey, { arrays, variable }) => {
  const { chunk_shape, shape } = arrays[variable]

  return [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [0, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ]
    .map((offset) =>
      getAdjacentChunk(offset, {
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
  { arrays, chunks, variable: { coordinates, name: variable, nullValue } }
) => {
  const activeChunkKeys = getActiveChunkKeys(chunkKey, { arrays, variable })
  const activeChunks = {}
  const allChunks = await Promise.all(
    activeChunkKeys.map(async (key) => {
      if (chunks[key]) {
        activeChunks[key] = chunks[key]
        return chunks[key]
      } else {
        const chunk = await getData(key, {
          arrays,
          variable: { coordinates, name: variable, nullValue },
        })
        activeChunks[key] = chunk
        return chunk
      }
    })
  )

  const combinedBounds = allChunks.reduce(
    (prev, { bounds: { lat, lon } }) => ({
      lat: [Math.min(lat[0], prev.lat[0]), Math.max(lat[1], prev.lat[1])],
      lon: [Math.min(lon[0], prev.lon[0]), Math.max(lon[1], prev.lon[1])],
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

  // TODO: remove assumption about lat, lon coordinate order

  const separator = arrays[variable].chunk_separator
  // stitch together chunks in order dictated by chunk keys
  // TODO: reverse column/row order if required by bounds + coordinates?
  // TODO: handle empty chunks https://zarr.readthedocs.io/en/stable/tutorial.html#empty-chunks (i.e. non-continuous chunks)

  const data = activeChunkKeys
    // sort by columns
    .sort(
      (a, b) => Number(a.split(separator)[1]) - Number(b.split(separator)[1])
    )
    // sort by rows
    .sort(
      (a, b) => Number(a.split(separator)[0]) - Number(b.split(separator)[0])
    )
    .reduce((rows, chunkKey) => {
      const rowNumber = chunkKey.split(separator)[0]
      const row = rows.find((row) => rowNumber === row[0])
      const filteredData = filterData(chunkKey, activeChunks[chunkKey].data, {
        arrays,
        variable,
      })
      if (row) {
        row[1] = concatColumns([row[1], filteredData], {
          dtype: 'float32',
        })
      } else {
        rows.push([rowNumber, filteredData])
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

  return data.hi(...truncatedShape)
}
