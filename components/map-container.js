import { useCallback, useEffect, useRef, useState } from 'react'

import { Box } from 'theme-ui'

const MapContainer = ({ sx, children, onDrag, onScroll }) => {
  const container = useRef(null)
  const moveListener = useRef(null)
  const [cursor, setCursor] = useState('grab')

  useEffect(() => {
    const wheelListener = document.addEventListener('wheel', (event) => {
      onScroll(event.deltaY / -48)
    })

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
      onDrag([event.movementX / width, event.movementY / height])
    }
    container.current.addEventListener('mousemove', moveListener.current)
  }, [onDrag])

  const handleMouseUp = useCallback(() => {
    setCursor('grab')
    if (moveListener.current) {
      container.current.removeEventListener('mousemove', moveListener.current)
      moveListener.current = null
    }
  })

  return (
    <Box
      sx={{ cursor, ...sx }}
      ref={container}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
    </Box>
  )
}

export default MapContainer
