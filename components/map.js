import { useEffect, useRef, useState } from 'react'
import { Box, Flex, Spinner, useThemeUI } from 'theme-ui'
import { alpha } from '@theme-ui/color'

import { Minimap, Path, Sphere } from './minimap'
import { PROJECTIONS, ASPECTS } from './constants'
import useStore from './store'
import { getMapProps, getProjection } from './utils'
import MapContainer from './map-container'
import Nav from './nav'
import Tile from './tile'

const Map = () => {
  const { theme } = useThemeUI()
  const basemaps = useStore((state) => state.basemaps)
  const projectionName = useStore((state) => state.projection)
  const loading = useStore((state) => state.loading)
  const url = useStore((state) => state.url)
  const renderable = useStore((state) => Object.values(state.chunks).length > 0)
  const activeChunkKeys = useStore((state) => state.activeChunkKeys)
  const chunkBounds = useStore((state) => state.chunks[state.chunkKey]?.bounds)
  const chunkKey = useStore((state) => state.chunkKey)
  const { lockZoom } = useStore((state) => state.variable)
  const resetCenterChunk = useStore((state) => state.resetCenterChunk)
  const [mapProps, setMapProps] = useState({
    projection: PROJECTIONS[projectionName],
    scale: 1,
    translate: [0, 0],
  })
  const mapPropsInitialized = useRef(false)

  useEffect(() => {
    mapPropsInitialized.current = false
  }, [projectionName])

  useEffect(() => {
    if (!mapPropsInitialized.current && chunkBounds) {
      const bounds = lockZoom
        ? chunkBounds
        : {
            lat: [-90, 90],
            lon: [-180, 180],
          }
      setMapProps(getMapProps(bounds, projectionName))
      mapPropsInitialized.current = true
    }
  }, [!!chunkBounds, projectionName, lockZoom])

  useEffect(() => {
    if (!url) {
      mapPropsInitialized.current = false
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
        height: 'calc(100vh - 56px)',
        mr: [-4, -5, -5, -6],
        flexDirection: 'column',
        justifyContent: 'center',
        background: alpha('secondary', 0.2),
      }}
    >
      {url ? (
        <MapContainer setMapProps={setMapProps}>
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

              {activeChunkKeys.map((key) => (
                <Tile key={key} chunkKey={key} />
              ))}
              {/* <Tile chunkKey={chunkKey} /> */}
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
