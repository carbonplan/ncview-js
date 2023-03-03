import { Minimap, Path } from '@carbonplan/minimaps'
import { useCallback, useEffect, useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { geoPath } from 'd3-geo'

import { PROJECTIONS, ASPECTS } from './constants'
import useStore from './store'
import { getMapProps, getProjection } from './utils'

const PROJECTION = 'naturalEarth1'

const Nav = ({ mapProps, setMapProps, sx }) => {
  const { theme } = useThemeUI()
  const [minimapProps, setMinimapProps] = useState({
    scale: 1,
    translate: [0, 0],
  })
  const [path, setPath] = useState(null)
  const staticBounds = useStore((state) => state.variable?.bounds)

  useEffect(() => {
    if (staticBounds) {
      setMinimapProps(getMapProps(staticBounds, PROJECTION))
    }
  }, [staticBounds])

  useEffect(() => {
    if (mapProps && minimapProps) {
      const mapProjection = getProjection(mapProps)

      const corners = [
        mapProjection.invert([0, 0]),
        mapProjection.invert([800, 0]),
        mapProjection.invert([800, 800 * ASPECTS[mapProjection.id]]),
        mapProjection.invert([0, 800 * ASPECTS[mapProjection.id]]),
      ]

      const f = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [...corners, corners[0]],
        },
      }

      const minimapProjection = getProjection({
        projection: PROJECTIONS[PROJECTION],
        ...minimapProps,
      })

      setPath(geoPath(minimapProjection)(f))
    }
  }, [mapProps, minimapProps])

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      const { x, y, width, height } = e.target.getBoundingClientRect()
      const point = [e.clientX - x, e.clientY - y]

      const minimapProjection = getProjection({
        projection: PROJECTIONS[PROJECTION],
        ...minimapProps,
      })

      const center = minimapProjection.invert([
        (point[0] / width) * 800,
        (point[1] / height) * 800 * ASPECTS[PROJECTION],
      ])

      const mapProjection = getProjection(mapProps)
      const mapPoint = mapProjection(center)
      const offset = [1 - (mapPoint[0] / 800) * 2, 1 - (mapPoint[1] / 400) * 2]

      setMapProps((prev) => ({
        ...prev,
        translate: prev.translate.map((d, i) => d + offset[i]),
      }))
    },
    [minimapProps, mapProps, setMapProps]
  )

  return (
    <Box sx={{ width: '300px', cursor: 'cell', ...sx }} onClick={handleClick}>
      <Minimap {...minimapProps} projection={PROJECTIONS[PROJECTION]}>
        <Path
          fill={theme.colors.background}
          stroke={theme.colors.primary}
          source={'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json'}
          feature={'land'}
          opacity={1}
        />{' '}
        {path && (
          <Box
            as='path'
            d={path}
            sx={{
              vectorEffects: 'non-scaling-stroke',
              stroke: 'primary',
              fill: 'primary',
              strokeWidth: 4,
              pointerEvents: 'none',
            }}
          />
        )}
      </Minimap>
    </Box>
  )
}

export default Nav
