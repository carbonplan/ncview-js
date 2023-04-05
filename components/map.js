import { useEffect, useRef, useState } from 'react'
import { Box, Flex, Spinner, useThemeUI } from 'theme-ui'
import { alpha } from '@theme-ui/color'
import { useThemedColormap } from '@carbonplan/colormaps'

import { Minimap, Path, Sphere } from './minimap'
import { PROJECTIONS, ASPECTS } from './constants'
import useStore from './store'
import { getMapProps, getProjection } from './utils'
import MapContainer from './map-container'
import Layer from './minimap/layer'
import Nav from './nav'
import Chunk from './chunk'
import { Point, Circle } from './region'

const Map = () => {
  const { theme } = useThemeUI()
  const basemaps = useStore((state) => state.basemaps)
  const projectionName = useStore((state) => state.projection)
  const loading = useStore((state) => state.loading)
  const url = useStore((state) => state.url)
  const renderable = useStore((state) => Object.values(state.chunks).length > 0)
  const activeChunkKeys = useStore((state) => state.activeChunkKeys)
  const chunkBounds = useStore((state) => state.chunks[state.chunkKey]?.bounds)
  const colormapName = useStore((state) => state.colormap)
  const colormap = useThemedColormap(colormapName, {
    count: 255,
    format: 'rgb',
  })
  const { northPole, nullValue } = useStore((state) => state.variable)
  const clim = useStore((state) => state.clim)
  const mode = useStore((state) => state.mode)

  const { lockZoom } = useStore((state) => state.variable)
  const resetCenterChunk = useStore((state) => state.resetCenterChunk)
  const [mapProps, setMapProps] = useState({
    projection: PROJECTIONS[projectionName],
    scale: 1,
    translate: [0, 0],
  })
  const mapPropsInitialized = useRef(0)

  useEffect(() => {
    mapPropsInitialized.current = 0
  }, [projectionName])

  useEffect(() => {
    if (mapPropsInitialized.current < 2 && chunkBounds) {
      const bounds = lockZoom
        ? chunkBounds
        : {
            lat: [-90, 90],
            lon: [-180, 180],
          }
      setMapProps(getMapProps(bounds, projectionName))
      mapPropsInitialized.current += 1
    }
  }, [!!chunkBounds, projectionName, lockZoom])

  useEffect(() => {
    if (!url) {
      mapPropsInitialized.current = 0
    }
  }, [url])

  useEffect(() => {
    const projection = getProjection(mapProps)
    const centerPoint = projection.invert([
      Math.round((800 * ASPECTS[projection.id]) / 2),
      Math.round(800 / 2),
    ])
    resetCenterChunk(centerPoint)
  }, [mapProps])

  return (
    <Flex
      sx={{
        height: '100vh',
        mr: [-4, -5, -5, -6],
        flexDirection: 'column',
        justifyContent: 'center',
        background: alpha('secondary', 0.2),
      }}
    >
      {url ? (
        <MapContainer setMapProps={setMapProps}>
          {mode === 'point' && <Point mapProps={mapProps} />}
          {mode === 'circle' && <Circle mapProps={mapProps} />}
          {renderable && (
            <Minimap {...mapProps}>
              {basemaps.oceanMask && (
                <Path
                  fill={theme.colors.background}
                  opacity={1}
                  source={
                    'https://storage.googleapis.com/carbonplan-maps/world-atlas/ocean-50m.json'
                  }
                  feature={'ocean'}
                />
              )}

              {basemaps.landMask && (
                <Path
                  fill={theme.colors.background}
                  source={
                    'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json'
                  }
                  feature={'land'}
                  opacity={1}
                />
              )}

              {basemaps.landBoundaries && (
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

              <Layer
                colormap={colormap}
                clim={clim}
                northPole={northPole}
                nullValue={nullValue}
              >
                {activeChunkKeys.map((key) => (
                  <Chunk key={key} chunkKey={key} />
                ))}
              </Layer>
            </Minimap>
          )}
          {loading && (
            <Box
              sx={{
                width: '100%',
                position: 'absolute',
                top: 1,
                left: 1,
              }}
            >
              <Spinner duration={750} size={32} />
            </Box>
          )}
          {renderable && lockZoom && (
            <Nav
              mapProps={mapProps}
              setMapProps={setMapProps}
              sx={{ position: 'fixed', bottom: '18px', right: '18px' }}
            />
          )}
        </MapContainer>
      ) : (
        <Box
          sx={{
            width: '100%',
            textAlign: 'center',
            fontFamily: 'mono',
            letterSpacing: 'mono',
            color: 'secondary',
          }}
        >
          Provide a Zarr link to explore data
        </Box>
      )}
    </Flex>
  )
}

export default Map
