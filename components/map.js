import { useCallback, useEffect, useRef, useState } from 'react'

import { Minimap, Path, Sphere, Raster } from '@carbonplan/minimaps'
import { useThemeUI, Box } from 'theme-ui'
import { useThemedColormap } from '@carbonplan/colormaps'

import { PROJECTIONS } from './constants'
import useStore from './store'
import { getMapProps } from './utils'
import Zoom from './zoom'
import MapContainer from './map-container'
import Loading from './loading'
import MinimapListener from './minimap-listener'

const Map = () => {
  const { theme } = useThemeUI()
  const colormapName = useStore((state) => state.colormap)
  const colormap = useThemedColormap(colormapName, {
    count: 255,
    format: 'rgb',
  })
  const [mapProps, setMapProps] = useState({ scale: 1, translate: [0, 0] })
  const basemaps = useStore((state) => state.basemaps)
  const projection = useStore((state) => state.projection)
  const clim = useStore((state) => state.clim)
  const loading = useStore((state) => state.loading)
  const url = useStore((state) => state.url)
  const data = useStore((state) => state.data)
  const bounds = useStore((state) => state.bounds)
  const chunkBounds = useStore((state) => state.chunks[state.chunkKey]?.bounds)
  const { northPole, nullValue } = useStore((state) => state.variable)
  const mapPropsInitialized = useRef(false)

  const panMap = useCallback((offset) => {
    setMapProps((prev) => ({
      scale: prev.scale,
      translate: prev.translate.map((d, i) => d + offset[i]),
    }))
  }, [])

  const zoomMap = useCallback((delta) => {
    setMapProps((prev) => {
      const updatedScale =
        prev.scale + delta < 0 ? prev.scale : prev.scale + delta
      return {
        scale: updatedScale,
        translate: prev.translate.map((d) => (d / prev.scale) * updatedScale),
      }
    })
  }, [])

  const handler = useCallback(
    ({ key, keyCode, metaKey }) => {
      if (!!data) {
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

          panMap(offset)
        } else if (key === '=') {
          // zoom in
          zoomMap(1)
        } else if (key === '-') {
          // zoom out
          zoomMap(-1)
        }
      }
    },
    [!!data]
  )

  useEffect(() => {
    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [handler])

  useEffect(() => {
    if (!mapPropsInitialized.current && chunkBounds) {
      setMapProps(getMapProps(chunkBounds, projection))
      mapPropsInitialized.current = true
    }
  }, [!!chunkBounds, projection])

  useEffect(() => {
    if (!url) {
      mapPropsInitialized.current = false
    }
  }, [url])

  return (
    <MapContainer
      sx={{ width: '100%', mx: [4], mb: [3] }}
      onDrag={panMap}
      onScroll={zoomMap}
    >
      {clim && (
        <Minimap {...mapProps} projection={PROJECTIONS[projection]}>
          <MinimapListener />
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

          {data && bounds && (
            <Raster
              source={data}
              bounds={bounds}
              northPole={northPole}
              colormap={colormap}
              mode={'lut'}
              clim={clim}
              nullValue={nullValue}
            />
          )}
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
          {loading || url ? <Loading /> : 'Provide a Zarr link to explore data'}
        </Box>
      ) : null}
      <Zoom zoomOut={() => zoomMap(-1)} zoomIn={() => zoomMap(1)} />
    </MapContainer>
  )
}

export default Map
