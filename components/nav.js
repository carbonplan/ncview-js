import { Graticule, Minimap, Path, Sphere } from '@carbonplan/minimaps'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { geoPath } from 'd3-geo'

import { PROJECTIONS, COLORMAP_COLORS } from './constants'
import useStore from './store'
import { getMapProps } from './utils'
import MinimapListener from './minimap-listener'

const Nav = ({ map, setMapProps, sx }) => {
  const { theme } = useThemeUI()
  const [minimapProps, setMinimapProps] = useState({
    scale: 1,
    translate: [0, 0],
  })
  const [path, setPath] = useState(null)
  const staticBounds = useStore((state) => state.variable?.bounds)
  const colormap = useStore((state) => state.colormap)
  const [minimap, setMinimap] = useState(null)

  useEffect(() => {
    if (staticBounds) {
      setMinimapProps(getMapProps(staticBounds, 'naturalEarth1'))
    }
  }, [staticBounds])

  useEffect(() => {
    if (map && minimap) {
      const { projection, width, height } = map
      const corners = [
        projection.invert([0, 0]),
        projection.invert([width, 0]),
        projection.invert([width, height]),
        projection.invert([0, height]),
      ]

      const f = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [...corners, corners[0]],
        },
      }

      setPath(geoPath(minimap.projection)(f))
    }
  }, [map, minimap])

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      const { x, y, width, height } = e.target.getBoundingClientRect()
      const point = [e.clientX - x, e.clientY - y]
      const center = minimap.projection.invert([
        (point[0] / width) * minimap.width,
        (point[1] / height) * minimap.height,
      ])

      const mapPoint = map.projection(center)
      const offset = [
        1 - (mapPoint[0] / map.width) * 2,
        1 - (mapPoint[1] / map.height) * 2,
      ]

      setMapProps((prev) => ({
        ...prev,
        translate: prev.translate.map((d, i) => d + offset[i]),
      }))
    },
    [minimap, map, setMapProps]
  )

  return (
    <Box sx={{ width: '300px', cursor: 'cell', ...sx }} onClick={handleClick}>
      <Minimap {...minimapProps} projection={PROJECTIONS.naturalEarth1}>
        <MinimapListener setter={setMinimap} />
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
              stroke: 'white',
              fill: 'white',
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
