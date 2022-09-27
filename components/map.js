import { useCallback, useEffect, useRef, useState } from 'react'
import * as zarr from 'zarrita/v2'
import FetchStore from 'zarrita/storage/fetch'
import { get } from 'zarrita/ndarray'
import ndarray from 'ndarray'

import { Blosc, GZip, Zlib, LZ4, Zstd } from 'numcodecs'
import { Minimap, Path, Sphere, Raster } from '@carbonplan/minimaps'
import {
  naturalEarth1,
  orthographic,
  mercator,
  equirectangular,
} from '@carbonplan/minimaps/projections'
import { useThemeUI, Box, Flex } from 'theme-ui'
import { Toggle, Select } from '@carbonplan/components'
import { useThemedColormap } from '@carbonplan/colormaps'

const projections = {
  naturalEarth1,
  orthographic,
  mercator,
  equirectangular,
}

const aspects = {
  naturalEarth1: 0.5,
  orthographic: 1,
  mercator: 1,
  equirectangular: 0.5,
}

const DATASET =
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/air_temperature.zarr'

// const DATASET =
//   'https://cmip6downscaling.blob.core.windows.net/vis/article/fig1/regions/central-america/gcm-tasmax.zarr'

const getRange = (arr) => {
  return arr.reduce(
    ([min, max], d) => [Math.min(min, d), Math.max(max, d)],
    [Infinity, -Infinity]
  )
}

const getBounds = ({ data, lat, lon }) => {
  const lonBounds = getRange(data[lon].data)

  return {
    lat: getRange(data[lat].data),
    lon: lonBounds.some((d) => d > 180)
      ? lonBounds.map((d) => d - 360)
      : lonBounds,
  }
}

const COMPRESSORS = {
  zlib: Zlib,
  blosc: Blosc,
}

const fetchData = async () => {
  // fetch zmetadata to figure out compression and variables
  const response = await fetch(`${DATASET}/.zmetadata`)
  const metadata = await response.json()

  const variables = Object.keys(metadata.metadata)
    .map((k) => k.match(/\w+(?=\/\.zarray)/))
    .filter(Boolean)
    .map((a) => a[0])
    .filter((d) => !['lat', 'lon'].includes(d))

  // temporarily hardcode to always look at first variable
  const variable = variables[0]
  const compressorId = metadata.metadata[`${variable}/.zarray`].compressor.id
  const compressor = COMPRESSORS[compressorId]

  if (!compressor) {
    throw new Error(`no compressor found for compressor.id=${compressorId}`)
  }

  zarr.registry.set(compressor.codecId, () => compressor)
  const store = new FetchStore(DATASET)
  const arrs = await Promise.all([
    zarr.get_array(store, '/' + variable),
    zarr.get_array(store, '/lat'),
    zarr.get_array(store, '/lon'),
  ])
  const nullValue = arrs[0].fill_value ?? 0
  const [data, lat, lon] = await Promise.all(arrs.map((arr) => get(arr)))
  const clim = getRange(data.data)
  const bounds = getBounds({ data: { lat, lon }, lat: 'lat', lon: 'lon' })

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
    const aspect = aspects[projection]
    const p = projections[projection]().fitSize(
      [Math.PI * (1 / aspect), Math.PI],
      f
    )
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
  }
}

const Map = () => {
  const { theme } = useThemeUI()
  const colormap = useThemedColormap('cool', { count: 255, format: 'rgb' })
  const [data, setData] = useState()
  const [bounds, setBounds] = useState()
  const [nullValue, setNullValue] = useState()
  const [clim, setClim] = useState()
  const [projection, setProjection] = useState('naturalEarth1')
  const getMapProps = useRef(null)
  const [mapProps, setMapProps] = useState({ scale: 1, translate: [0, 0] })
  const [basemaps, setBasemaps] = useState({
    land: true,
    ocean: false,
  })

  useEffect(() => {
    fetchData().then((result) => {
      setData(result.data)
      setBounds(result.bounds)
      setNullValue(result.nullValue)
      setClim(result.clim)
      getMapProps.current = result.getMapProps
      setMapProps(getMapProps.current(projection))
    })
  }, [])

  const handleProjectionChange = useCallback((e) => {
    setProjection(e.target.value)
    if (getMapProps.current) {
      setMapProps(getMapProps.current(e.target.value))
    }
  })

  return (
    <>
      <Box sx={{ width: '200px', mt: [2], ml: [4] }}>
        <Select onChange={handleProjectionChange} value={projection}>
          <option value='naturalEarth1'>naturalEarth1</option>
          <option value='orthographic'>orthographic</option>
          <option value='mercator'>mercator</option>
          <option value='equirectangular'>equirectangular</option>
        </Select>

        <Flex sx={{ gap: 2 }}>
          Land
          <Toggle
            value={basemaps.land}
            onClick={() => setBasemaps((v) => ({ ...v, land: !v.land }))}
          />
        </Flex>

        <Flex sx={{ gap: 2 }}>
          Ocean
          <Toggle
            value={basemaps.ocean}
            onClick={() => setBasemaps((v) => ({ ...v, ocean: !v.ocean }))}
          />
        </Flex>
      </Box>

      <Box sx={{ width: '50%', ml: [4], mt: [6], mb: [3] }}>
        {data && bounds && clim && (
          <Minimap projection={projections[projection]}>
            {basemaps.ocean && (
              <Path
                fill={theme.colors.background}
                opacity={1}
                source={
                  'https://storage.googleapis.com/carbonplan-maps/world-atlas/ocean-50m.json'
                }
                feature={'ocean'}
              />
            )}

            {basemaps.land && (
              <Path
                stroke={theme.colors.primary}
                source={
                  'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json'
                }
                feature={'land'}
                opacity={1}
              />
            )}

            <Sphere fill={theme.colors.background} />

            <Raster
              source={data}
              bounds={bounds}
              colormap={colormap}
              mode={'lut'}
              clim={clim}
              nullValue={nullValue}
            />
          </Minimap>
        )}
      </Box>
    </>
  )
}

export default Map
