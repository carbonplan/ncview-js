import { useEffect, useRef, useState } from 'react'

import { Minimap, Path, Sphere, Raster } from '@carbonplan/minimaps'
import { useThemeUI, Box } from 'theme-ui'
import { useThemedColormap } from '@carbonplan/colormaps'

import { PROJECTIONS } from './constants'
import useStore from './store'
import { getMapProps } from './utils'
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
  const basemaps = useStore((state) => state.basemaps)
  const projectionName = useStore((state) => state.projection)
  const clim = useStore((state) => state.clim)
  const loading = useStore((state) => state.loading)
  const url = useStore((state) => state.url)
  const data = useStore((state) => state.data)
  const bounds = useStore((state) => state.bounds)
  const chunkBounds = useStore((state) => state.chunks[state.chunkKey]?.bounds)
  const { northPole, nullValue } = useStore((state) => state.variable)
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
      setMapProps(getMapProps(chunkBounds, projectionName))
      mapPropsInitialized.current = true
    }
  }, [!!chunkBounds, projectionName])

  useEffect(() => {
    if (!url) {
      mapPropsInitialized.current = false
    }
  }, [url])

  return (
    <MapContainer
      sx={{ width: '100%', mx: [4], mb: [3] }}
      setMapProps={setMapProps}
    >
      {clim && (
        <Minimap {...mapProps}>
          <MinimapListener />
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
    </MapContainer>
  )
}

export default Map
