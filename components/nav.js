import { useCallback, useEffect, useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { geoPath } from 'd3-geo'

import { Minimap, Path } from './minimap'
import { PROJECTIONS, ASPECTS } from './constants'
import { getProjection } from './utils/data'

const PROJECTION = 'naturalEarth1'
const MINIMAP_PROPS = {
  scale: 1,
  translate: [0, 0],
}
const Nav = ({ mapProps, setMapProps, sx }) => {
  const { theme } = useThemeUI()
  const [path, setPath] = useState(null)

  useEffect(() => {
    if (mapProps) {
      const mapProjection = getProjection(mapProps)

      let corners = [
        mapProjection.invert([0, 0]),
        mapProjection.invert([800, 0]),
        mapProjection.invert([800, 800 * ASPECTS[mapProjection.id]]),
        mapProjection.invert([0, 800 * ASPECTS[mapProjection.id]]),
      ]

      if (corners.some(([lon, lat]) => lat > 90 || lat < -90)) {
        setPath(null)
        return
      }

      // calculate number of degrees latitude that the map spans
      const degrees = Math.abs(corners[0][1] - corners[2][1])
      if (degrees > 0 && degrees < 5) {
        // if less than 5, scale up the drawn box to represent 5deg latitude height
        const scale = 5 / degrees
        const offset = 400 * (scale - 1)
        corners = [
          mapProjection.invert([-offset, -offset * ASPECTS[mapProjection.id]]),
          mapProjection.invert([
            800 + offset,
            -offset * ASPECTS[mapProjection.id],
          ]),
          mapProjection.invert([
            800 + offset,
            (800 + offset) * ASPECTS[mapProjection.id],
          ]),
          mapProjection.invert([
            -offset,
            (800 + offset) * ASPECTS[mapProjection.id],
          ]),
        ]
      }

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
        ...MINIMAP_PROPS,
      })

      setPath(geoPath(minimapProjection)(f))
    }
  }, [mapProps])

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      const { x, y, width, height } = e.target.getBoundingClientRect()
      const point = [e.clientX - x, e.clientY - y]

      const minimapProjection = getProjection({
        projection: PROJECTIONS[PROJECTION],
        ...MINIMAP_PROPS,
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
    [mapProps, setMapProps]
  )

  return (
    <Box sx={{ width: '300px', cursor: 'cell', ...sx }} onClick={handleClick}>
      <Minimap {...MINIMAP_PROPS} projection={PROJECTIONS[PROJECTION]}>
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
