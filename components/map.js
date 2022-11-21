import { useEffect, useRef, useState } from 'react'

import { Minimap, Path, Sphere, Raster } from '@carbonplan/minimaps'
import { useThemeUI, Box } from 'theme-ui'
import { useThemedColormap } from '@carbonplan/colormaps'
import { fetchData } from './utils'
import { PROJECTIONS } from './constants'
import { useDatasetStore, useDisplayStore } from './stores'

const Map = () => {
  const { theme } = useThemeUI()
  const colormapName = useDisplayStore((state) => state.colormap)
  const colormap = useThemedColormap(colormapName, {
    count: 255,
    format: 'rgb',
  })
  const [data, setData] = useState()
  const [bounds, setBounds] = useState()
  const [northPole, setNorthPole] = useState(null)
  const [nullValue, setNullValue] = useState()
  const getMapProps = useRef(null)
  const [mapProps, setMapProps] = useState({ scale: 1, translate: [0, 0] })
  const basemaps = useDisplayStore((state) => state.basemaps)
  const projection = useDisplayStore((state) => state.projection)
  const clim = useDisplayStore((state) => state.clim)
  const setClim = useDisplayStore((state) => state.setClim)
  const url = useDatasetStore((state) => state.url)

  useEffect(() => {
    if (url) {
      fetchData(url).then((result) => {
        setData(result.data)
        setBounds(result.bounds)
        setNullValue(result.nullValue)
        setClim(result.clim)
        setNorthPole(result.northPole)
        getMapProps.current = result.getMapProps
        setMapProps(getMapProps.current(projection))
      })
    }
  }, [url])

  useEffect(() => {
    const handler = ({ key, keyCode, metaKey }) => {
      // Only handle keydowns after initial map props have been set using getMapProps
      if (getMapProps.current) {
        if (key.includes('Arrow')) {
          const offsets = {
            ArrowUp: [0, 1],
            ArrowRight: [-1, 0],
            ArrowDown: [0, -1],
            ArrowLeft: [1, 0],
          }
          const offset = offsets[key]

          if (!offset) {
            throw new Error(`Unexpected arrow key: ${key}`)
          }

          setMapProps((prev) => ({
            scale: prev.scale,
            translate: prev.translate.map((d, i) => d + offset[i]),
          }))
        } else if (key === '=') {
          // zoom in
          setMapProps((prev) => ({
            scale: prev.scale + 1,
            translate: prev.translate.map(
              (d) => (d / prev.scale) * (prev.scale + 1)
            ),
          }))
        } else if (key === '-') {
          // zoom out
          setMapProps((prev) => ({
            scale: prev.scale - 1,
            translate: prev.translate.map(
              (d) => (d / prev.scale) * (prev.scale - 1)
            ),
          }))
        }
      }
    }
    window.addEventListener('keydown', handler)

    return () => {
      document.removeEventListener('keydown', handler)
    }
  }, [])

  useEffect(() => {
    if (getMapProps.current) {
      setMapProps(getMapProps.current(projection))
    }
  }, [projection])

  return (
    <Box sx={{ width: '100%', mx: [4], mb: [3] }}>
      {data && bounds && clim && (
        <Minimap {...mapProps} projection={PROJECTIONS[projection]}>
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
            northPole={northPole}
            colormap={colormap}
            mode={'lut'}
            clim={clim}
            nullValue={nullValue}
          />
        </Minimap>
      )}

      {!data ? (
        <Box
          sx={{
            width: '100%',
            mt: '30vh',
            textAlign: 'center',
            fontFamily: 'mono',
            letterSpacing: 'mono',
            color: 'secondary',
          }}
        >
          {url ? 'Loading...' : 'Provide a Zarr link to explore data'}
        </Box>
      ) : null}
    </Box>
  )
}

export default Map
