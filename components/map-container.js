import { useCallback, useEffect, useRef, useState } from 'react'
import { Box } from 'theme-ui'

import useStore from './store'

const MapContainer = ({ children, setMapProps }) => {
  const container = useRef(null)
  const moveListener = useRef(null)
  const [cursor, setCursor] = useState('grab')
  const hasData = useStore((state) => !!state.data)
  const lockZoom = useStore((state) =>
    state.dataset?.variable ? state.dataset.variable.lockZoom : true
  )

  const panMap = useCallback((offset) => {
    setMapProps((prev) => ({
      ...prev,
      translate: prev.translate.map((d, i) => d + offset[i]),
    }))
  }, [])

  const zoomMap = useCallback(
    (delta, offset = [0, 0]) => {
      if (lockZoom) return
      setMapProps((prev) => {
        delta = delta * prev.scale
        const updatedScale =
          prev.scale + delta < 0 ? prev.scale : prev.scale + delta
        return {
          ...prev,
          scale: updatedScale,
          translate: prev.translate.map(
            (d, i) => offset[i] - ((offset[i] - d) / prev.scale) * updatedScale
          ),
        }
      })
    },
    [lockZoom]
  )

  const handler = useCallback(
    ({ key, keyCode, metaKey, ...rest }) => {
      if (document.activeElement !== container.current) {
        return
      }

      if (hasData) {
        if (key.includes('Arrow')) {
          const offsets = {
            ArrowUp: [0, 1],
            ArrowRight: [-1, 0],
            ArrowDown: [0, -1],
            ArrowLeft: [1, 0],
          }
          const offset = offsets[key]

          if (!offset) {
            throw new Error(`Unexpected arrow key: ${key}`)
          }

          panMap(offset)
        } else if (key === '=') {
          // zoom in
          zoomMap(1)
        } else if (key === '-') {
          // zoom out
          zoomMap(-1)
        }
      }
    },
    [hasData, panMap, zoomMap]
  )
  useEffect(() => {
    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [handler])

  const handleMouseDown = useCallback(() => {
    const height = container.current.clientHeight
    const width = container.current.clientWidth

    setCursor('grabbing')

    if (moveListener.current) {
      container.current.removeEventListener('mousemove', moveListener.current)
    }
    moveListener.current = (event) => {
      panMap([(event.movementX / width) * 2, (event.movementY / height) * 2])
    }

    container.current.addEventListener('mousemove', moveListener.current)
  }, [panMap])

  const handleMouseUp = useCallback(() => {
    setCursor('grab')
    if (moveListener.current) {
      container.current.removeEventListener('mousemove', moveListener.current)
      moveListener.current = null
    }
  })

  const handleWheel = useCallback(
    (event) => {
      const height = container.current.clientHeight
      const width = container.current.clientWidth
      const { x, y } = container.current.getBoundingClientRect()
      const point = [event.clientX - x, event.clientY - y]

      const offset = [(point[0] / width) * 2 - 1, (point[1] / height) * 2 - 1]
      const delta = event.deltaY / -150

      zoomMap(delta, offset)
    },
    [panMap, zoomMap]
  )

  return (
    <Box
      sx={{
        width: '100%',
        height: 'fit-content',
        position: 'relative',
        background: 'background',
        cursor,
        '&:focus, &:focus-visible': { outline: 'none' },
      }}
      ref={container}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      id='container'
    >
      {children}
    </Box>
  )
}

export default MapContainer
