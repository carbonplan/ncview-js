import { Minimap, Path } from '@carbonplan/minimaps'
import { useEffect, useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { geoPath } from 'd3-geo'

import { PROJECTIONS } from './constants'
import useStore from './store'
import { getMapProps } from './utils'
import MinimapListener from './minimap-listener'

const Nav = ({ map }) => {
  const { theme } = useThemeUI()
  const [mapProps, setMapProps] = useState({
    scale: 1,
    translate: [0, 0],
  })
  const [path, setPath] = useState(null)
  const staticBounds = useStore((state) => state.variable?.bounds)
  const [minimap, setMinimap] = useState(null)

  useEffect(() => {
    if (staticBounds) {
      setMapProps(getMapProps(staticBounds, 'naturalEarth1'))
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

  return (
    <Box sx={{ width: '35%' }}>
      <Minimap {...mapProps} projection={PROJECTIONS.naturalEarth1}>
        <MinimapListener setter={setMinimap} />
        <Path
          stroke={theme.colors.primary}
          source={'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json'}
          feature={'land'}
          opacity={1}
        />
        {path && (
          <Box
            as='path'
            d={path}
            sx={{
              vectorEffects: 'non-scaling-stroke',
              stroke: 'primary',
              opacity: 0.7,
              fill: 'primary',
              strokeWidth: 3,
              pointerEvents: 'none',
            }}
          />
        )}
      </Minimap>
    </Box>
  )
}

export default Nav
