import { Graticule, Minimap, Path, Sphere } from '@carbonplan/minimaps'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { geoPath } from 'd3-geo'

import { PROJECTIONS } from './constants'
import useStore from './store'
import { getMapProps } from './utils'
import MinimapListener from './minimap-listener'

const Nav = ({ map, setMapProps }) => {
  const { theme } = useThemeUI()
  const [minimapProps, setMinimapProps] = useState({
    scale: 1,
    translate: [0, 0],
  })
  const [path, setPath] = useState(null)
  const staticBounds = useStore((state) => state.variable?.bounds)
  const [minimap, setMinimap] = useState(null)
  const container = useRef(null)
  const moveListener = useRef(null)

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

  // const handleMouseDown = useCallback((e) => {
  //   const { x, y, width, height } = e.target.getBoundingClientRect()

  //   // setCursor('grabbing')

  //   if (moveListener.current) {
  //     container.current.removeEventListener('mousemove', moveListener.current)
  //   }
  //   moveListener.current = (event) => {
  //     // panMap([(event.movementX / width) * 2, (event.movementY / height) * 2])
  //   }

  //   container.current.addEventListener('mousemove', moveListener.current)
  // }, [])

  // const handleMouseUp = useCallback(() => {
  //   // setCursor('grab')
  //   if (moveListener.current) {
  //     container.current.removeEventListener('mousemove', moveListener.current)
  //     moveListener.current = null
  //   }
  // })

  const handleClick = useCallback(
    (e) => {
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
    <Box
      sx={{ width: '35%' }}
      // onMouseDown={handleMouseDown}
      // onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      <Minimap {...minimapProps} projection={PROJECTIONS.naturalEarth1}>
        <MinimapListener setter={setMinimap} />
        <Path
          stroke={theme.colors.primary}
          source={'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json'}
          feature={'land'}
          opacity={1}
        />
        <Sphere stroke={theme.colors.primary} fill='transparent' />
        <Graticule stroke={theme.colors.primary} />
        {path && (
          <Box
            as='path'
            d={path}
            sx={{
              vectorEffects: 'non-scaling-stroke',
              stroke: 'blue',
              fill: 'blue',
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
