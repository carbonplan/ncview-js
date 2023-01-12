import { useCallback, useEffect, useRef, useState } from 'react'
import { Box } from 'theme-ui'

import useStore from './store'
import Zoom from './zoom'

const MapContainer = ({ sx, children, setMapProps }) => {
  const container = useRef(null)
  const moveListener = useRef(null)
  const [cursor, setCursor] = useState('grab')
  const hasData = useStore((state) => !!state.data)

  const panMap = useCallback((offset) => {
    setMapProps((prev) => ({
      ...prev,
      translate: prev.translate.map((d, i) => d + offset[i]),
    }))
  }, [])

  const zoomMap = useCallback((delta) => {
    setMapProps((prev) => {
      const updatedScale =
        prev.scale + delta < 0 ? prev.scale : prev.scale + delta
      return {
        ...prev,
        scale: updatedScale,
        translate: prev.translate.map((d) => (d / prev.scale) * updatedScale),
      }
    })
  }, [])

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
    [hasData]
  )
  useEffect(() => {
    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [handler])

  useEffect(() => {
    const wheelListener = (event) => zoomMap(event.deltaY / -48)
    document.addEventListener('wheel', wheelListener)

    return () => {
      document.removeEventListener('wheel', wheelListener)
    }
  }, [])

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

  return (
    <Box
      sx={{ cursor, '&:focus, &:focus-visible': { outline: 'none' }, ...sx }}
      ref={container}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
      <Zoom zoomOut={() => zoomMap(-1)} zoomIn={() => zoomMap(1)} />
    </Box>
  )
}

export default MapContainer
