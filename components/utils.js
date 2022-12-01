import * as zarr from 'zarrita/v2'
import FetchStore from 'zarrita/storage/fetch'
import { get } from 'zarrita/ndarray'
import ndarray from 'ndarray'

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

const getBounds = ({ coordinates, nullValue }) => {
  return coordinates.map((coord) => getRange(coord.data, { nullValue }))
}

const getChunkBounds = (
  chunkKeyArray,
  { coordinates, chunk, shape, nullValue }
) => {
  return coordinates.map((coord, i) => {
    if (chunkKeyArray.length > 0 && chunk[i] < shape[i]) {
      const start = chunkKeyArray[i] * chunk[i]
      return getRange(coord.data.slice(start, start + chunk[i]), { nullValue })
    } else {
      return getRange(coord.data, { nullValue })
    }
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

export const getVariableInfo = async (
  variable,
  { arrays, metadata, isChunked }
) => {
  const dataArray = arrays[variable]
  const chunkKeyArray = isChunked ? dataArray.shape.map((d) => 0) : []
  const zattrs = metadata.metadata[`${variable}/.zattrs`]

  const gridMapping = zattrs.grid_mapping
    ? metadata.metadata[`${zattrs.grid_mapping}/.zattrs`]
    : null
  const coordArrays = zattrs['_ARRAY_DIMENSIONS'].map((coord) => arrays[coord])

  const coordinates = await Promise.all(coordArrays.map((arr) => get(arr)))

  const nullValue = getNullValue(dataArray)

  // TODO: remove assumption about lat, lon coordinate order
  const [latRange, lonRange] = getBounds({
    coordinates,
    nullValue,
  })
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
  const data = await (chunkKeyArray.length > 0
    ? dataArray
        .get_chunk(chunkKeyArray)
        .then((c) => ndarray(new Float32Array(c.data), c.shape))
    : get(dataArray))

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
    shape: dataArray.shape,
    nullValue,
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

export const getChunkKey = (
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
    newChunkKeyArray.some((d, i) => d * chunk[i] < 0 || d * chunk[i] > shape[i])
  ) {
    return null
  } else {
    return toKeyString(newChunkKeyArray, { arrays, variable })
  }
}
