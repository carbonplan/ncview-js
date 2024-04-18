import { useThemeUI } from 'theme-ui'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import useStore from '../data/store'
import { getProjection } from '../utils/data'
import { ASPECTS } from '../constants'
import { getPlotSelector, getLines } from '../utils/plots'

const Point = ({ mapProps }) => {
  const { theme } = useThemeUI()
  const container = useRef(null)
  const moveListener = useRef(null)
  const plotCenter = useStore((state) => state.plotCenter)
  const setPlotCenter = useStore((state) => state.setPlotCenter)
  const setPlotData = useStore((state) => state.setPlotData)
  const selectors = useStore((state) => state.selectors)
  const chunksToRender = useStore((state) => state.chunksToRender)
  const chunks = useStore((state) => state.dataset.level.chunks)
  const variable = useStore((state) => state.dataset.level.variable)
  const chunk_shape = useStore(
    (state) => state.dataset.level?.variable?.chunk_shape
  )

  const projectedCenter = useMemo(() => {
    if (plotCenter) {
      const height = container.current?.clientHeight
      const width = container.current?.clientWidth
      const proj = getProjection(mapProps)
      const c = proj(plotCenter)
      return [(c[0] / 800) * width, (c[1] / (800 * ASPECTS[proj.id])) * height]
    }
  }, [plotCenter, mapProps])

  const updatePoint = useCallback(
    (point) => {
      const height = container.current.clientHeight
      const width = container.current.clientWidth
      const proj = getProjection(mapProps)
      const p = proj.invert([
        (point[0] / width) * 800,
        (point[1] / height) * 800 * ASPECTS[proj.id],
      ])

      setPlotCenter(p)
    },
    [mapProps, setPlotCenter]
  )

  useEffect(() => {
    if (!plotCenter || !variable) {
      setPlotData(null)
    } else {
      const selector = getPlotSelector(selectors, chunk_shape)

      const { range, coords, points } = getLines(plotCenter, selector ?? {}, {
        activeChunkKeys: chunksToRender,
        chunks,
        variable,
        selectors,
      })

      setPlotData({
        yValues: Array.isArray(points[0]) ? points[0] : [points[0]],
        range,
        selectorName: selector?.name,
        centerPoint: coords[0],
      })
    }
  }, [
    plotCenter,
    setPlotData,
    selectors,
    variable?.name,
    chunksToRender,
    chunks,
  ])

  useEffect(() => {
    if (!projectedCenter) {
      const height = container.current.clientHeight
      const width = container.current.clientWidth

      updatePoint([width / 2, height / 2])
    }
  }, [projectedCenter])

  const handleMouseDown = useCallback(() => {
    if (moveListener.current) {
      container.current.removeEventListener('mousemove', moveListener.current)
    }
    moveListener.current = (event) => {
      event.stopPropagation()

      const { x, y } = container.current.getBoundingClientRect()
      updatePoint([event.clientX - x, event.clientY - y])
    }

    container.current.addEventListener('mousemove', moveListener.current)
  }, [updatePoint])

  const handleMouseUp = useCallback((e) => {
    if (moveListener.current) {
      container.current.removeEventListener('mousemove', moveListener.current)
      moveListener.current = null
    }
  })

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
    >
      {projectedCenter && (
        <circle
          r={8}
          fill={theme.colors.primary}
          cx={projectedCenter[0]}
          cy={projectedCenter[1]}
          cursor='move'
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />
      )}
    </svg>
  )
}

export default Point
