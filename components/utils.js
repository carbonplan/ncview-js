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

const getBounds = ({ data, lat, lon }) => {
  return {
    lat: getRange(data[lat].data),
    lon: getRange(data[lon].data),
  }
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

export const fetchData = async (url, metadata, variable) => {
  const compressorId = metadata.metadata[`${variable}/.zarray`].compressor.id
  const compressor = COMPRESSORS[compressorId]
  if (!compressor) {
    throw new Error(`no compressor found for compressor.id=${compressorId}`)
  }

  const zattrs = metadata.metadata[`${variable}/.zattrs`]
  const coords = zattrs['_ARRAY_DIMENSIONS']

  const gridMapping = zattrs.grid_mapping
    ? metadata.metadata[`${zattrs.grid_mapping}/.zattrs`]
    : null

  zarr.registry.set(compressor.codecId, () => compressor)
  const store = new FetchStore(url)

  const arrs = await Promise.all([
    zarr.get_array(store, '/' + variable),
    ...coords.map((coord) => zarr.get_array(store, `/${coord}`)),
  ])

  let nullValue = arrs[0].fill_value ?? 0
  if (/NaN/gi.test(nullValue)) {
    nullValue = NaN
  }

  const [data, lat, lon] = await Promise.all(arrs.map((arr) => get(arr)))
  const clim = getRange(data.data)

  const bounds = getBounds({
    data: { lat, lon },
    lat: 'lat',
    lon: 'lon',
  })

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

  let normalizedData = ndarray(new Float32Array(data.data), data.shape)

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

  return {
    nullValue,
    clim,
    data: normalizedData,
    bounds,
    getMapProps,
    ...(gridMapping
      ? {
          northPole: [
            gridMapping.grid_north_pole_longitude,
            gridMapping.grid_north_pole_latitude,
          ],
        }
      : {}),
  }
}
