import { useCallback, useEffect, useRef, useState } from 'react'
import { Box } from 'theme-ui'

import useStore from './data/store'

const MapContainer = ({ children, setMapProps }) => {
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
        }
      }
    },
    [hasData, panMap]
  )
  useEffect(() => {
    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [handler])

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault()
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
    },
    [panMap]
  )

  const handleMouseUp = useCallback(() => {
    setCursor('grab')
    if (moveListener.current) {
      container.current.removeEventListener('mousemove', moveListener.current)
      moveListener.current = null
    }
  })

  return (
    <Box
      sx={{
        width: '100%',
        height: 'fit-content',
        position: 'relative',
        background: 'background',
        cursor,
        '&:focus': {
          outline: 0,
          outline: 'none',
        },
        '&:focus-visible': {
          outline: 0,
          outline: 'none',
        },
      }}
      ref={container}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      id='container'
    >
      {children}
    </Box>
  )
}

export default MapContainer
