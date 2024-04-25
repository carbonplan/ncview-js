import { useEffect, useRef, useState } from 'react'
import { useThemeUI } from 'theme-ui'
import { useThemedColormap } from '@carbonplan/colormaps'

import { Minimap, Path, Sphere } from './minimap'
import { PROJECTIONS, ASPECTS } from './constants'
import useStore from './data/store'
import { getMapProps, getProjection, validatePoint } from './utils/data'
import MapContainer from './map-container'
import Layer from './minimap/layer'
import Nav from './nav'
import Chunk from './chunk'
import { Point, Circle } from './region'

const ProxyMap = () => {
  const { theme } = useThemeUI()
  const basemaps = useStore((state) => state.basemaps)
  const projectionName = useStore((state) => state.projection)
  const dataset = useStore((state) => state.dataset)
  const chunksToRender = useStore((state) => state.chunksToRender)
  const chunkBounds = useStore(
    (state) =>
      state.dataset?.level &&
      state.dataset.level.chunks[state.dataset.chunkKey]?.bounds
  )
  const colormapName = useStore((state) => state.colormap)
  const colormap = useThemedColormap(colormapName, {
    count: 255,
    format: 'rgb',
  })
  const { northPole, nullValue } = useStore(
    (state) => state.dataset?.level?.variable || {}
  )
  const clim = useStore((state) => state.clim)
  const plotMode = useStore((state) => state.plotMode)

  const resetMapProps = useStore((state) => state.resetMapProps)
  const [mapProps, setMapProps] = useState({
    projection: PROJECTIONS[projectionName],
    scale: 1,
    translate: [0, 0],
  })
  const mapPropsInitialized = useRef(0)

  useEffect(() => {
    mapPropsInitialized.current = false
  }, [projectionName])

  useEffect(() => {
    if (!mapPropsInitialized.current && chunkBounds) {
      const p = getMapProps(chunkBounds, projectionName)

      setMapProps(p)
      mapPropsInitialized.current = true
    }
  }, [!!chunkBounds, projectionName])

  useEffect(() => {
    if (!dataset) {
      mapPropsInitialized.current = false
    }
  }, [dataset])

  useEffect(() => {
    const projection = getProjection(mapProps)
    const centerPoint = projection.invert([
      Math.round((800 * ASPECTS[projection.id]) / 2),
      Math.round(800 / 2),
    ])

    if (!validatePoint(centerPoint)) {
      return
    }
    resetMapProps(centerPoint, mapProps.scale / 2)
  }, [mapProps])

  return (
    <MapContainer setMapProps={setMapProps}>
      {plotMode === 'point' && <Point mapProps={mapProps} />}
      {plotMode === 'circle' && <Circle mapProps={mapProps} />}
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
            source={'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json'}
            feature={'land'}
            opacity={1}
          />
        )}

        {basemaps.landBoundaries && (
          <Path
            stroke={theme.colors.primary}
            source={'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json'}
            feature={'land'}
            opacity={1}
          />
        )}

        <Sphere fill={theme.colors.background} />
        {clim && (
          <Layer
            colormap={colormap}
            clim={clim}
            northPole={northPole}
            nullValue={nullValue}
          >
            {chunksToRender.map((key) => (
              <Chunk key={key} chunkKey={key} />
            ))}
          </Layer>
        )}
      </Minimap>

      {clim && (
        <Nav
          mapProps={mapProps}
          setMapProps={setMapProps}
          sx={{
            position: 'fixed',
            bottom: '18px',
            right: '18px',
            transition: '0.1s',
          }}
        />
      )}
    </MapContainer>
  )
}

export default ProxyMap
