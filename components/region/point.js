import { useThemeUI } from 'theme-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import useStore from '../store'
import { getProjection } from '../utils'

const Point = ({ mapProps }) => {
  const { theme } = useThemeUI()
  const container = useRef(null)
  const [[cx, cy], setCircle] = useState([])
  const setCenter = useStore((state) => state.setCenter)

  const updatePoint = useCallback(
    (point) => {
      const height = container.current.clientHeight
      const width = container.current.clientWidth
      const proj = getProjection(mapProps)
      const p = proj.invert([
        (point[0] / width) * 800,
        (point[1] / height) * 800 * 0.5,
      ])
      const c = proj(p)

      setCircle([(c[0] / 800) * width, (c[1] / 400) * height])
      setCenter(p)
    },
    [mapProps, setCircle, setCenter]
  )

  useEffect(() => {
    if ([cx, cy].some((d) => d == null)) {
      const height = container.current.clientHeight
      const width = container.current.clientWidth

      updatePoint([width / 2, height / 2])
    }
  }, [cx, cy, mapProps])

  const handleClick = useCallback(
    (event) => {
      const { x, y } = container.current.getBoundingClientRect()
      updatePoint([event.clientX - x, event.clientY - y])
    },
    [updatePoint]
  )

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      }}
      ref={container}
      onClick={handleClick}
    >
      <circle r={8} fill={theme.colors.primary} cx={cx} cy={cy} />
    </svg>
  )
}

export default Point
