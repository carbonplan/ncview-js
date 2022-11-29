import * as zarr from 'zarrita/v2'
import FetchStore from 'zarrita/storage/fetch'
import { get } from 'zarrita/ndarray'
import ndarray from 'ndarray'

import { Blosc, GZip, Zlib, LZ4, Zstd } from 'numcodecs'
import { PROJECTIONS, ASPECTS } from './constants'

const getRange = (arr) => {
  return arr.reduce(
    ([min, max], d) => [Math.min(min, d), Math.max(max, d)],
    [Infinity, -Infinity]
  )
}

const getChunkBounds = (chunkKey, { coordinates, chunk, shape }) => {
  return coordinates.map((coord, i) => {
    if (chunkKey.length > 0 && chunk[i] < shape[i]) {
      const start = chunkKey[i] * chunk[i]
      return getRange(coord.data.slice(start, start + chunk[i]))
    } else {
      return getRange(coord.data)
    }
  })
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
  const chunkKey = isChunked ? arrays[variable].shape.map((d) => 0) : []

  let nullValue = arrays[variable].fill_value ?? 0
  if (/NaN/gi.test(nullValue)) {
    nullValue = NaN
  }

  const zattrs = metadata.metadata[`${variable}/.zattrs`]

  const gridMapping = zattrs.grid_mapping
    ? metadata.metadata[`${zattrs.grid_mapping}/.zattrs`]
    : null
  const coordArrays = zattrs['_ARRAY_DIMENSIONS'].map((coord) => arrays[coord])

  const coordinates = await Promise.all(coordArrays.map((arr) => get(arr)))

  return {
    chunkKey,
    nullValue,
    northPole: gridMapping
      ? [
          gridMapping.grid_north_pole_longitude,
          gridMapping.grid_north_pole_latitude,
        ]
      : undefined,
    coordinates,
  }
}

export const getData = async (chunkKey, { arrays, coordinates, variable }) => {
  const dataArray = arrays[variable]
  const data = await (chunkKey.length > 0
    ? dataArray
        .get_chunk(chunkKey)
        .then((c) => ndarray(new Float32Array(c.data), c.shape))
    : get(dataArray))

  const clim = getRange(data.data)

  let normalizedData = ndarray(new Float32Array(data.data), data.shape)

  // TODO: ingest lat/lon from API or user preferences
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

  const [latRange, lonRange] = getChunkBounds(chunkKey, {
    coordinates,
    chunk: dataArray.chunk_shape,
    shape: dataArray.shape,
  })
  const bounds = { lat: latRange, lon: lonRange }

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

  const getMapProps = (projection) => {
    const aspect = ASPECTS[projection]
    const p = PROJECTIONS[projection]().fitSize([Math.PI * 2, Math.PI], f)
    const scale = p.scale()
    const translate = [
      p.translate()[0] / Math.PI - 1,
      ((1 / aspect) * p.translate()[1]) / Math.PI - 1,
    ]

    return { scale, translate }
  }

  return { data: normalizedData, clim, bounds, getMapProps }
}
