import { useCallback, useEffect, useRef, useState } from 'react'
import { Box } from 'theme-ui'

const batcher = (func, getOffset, delay) => {
  let inDebounce
  let batchedOffset
  return (event) => {
    clearTimeout(inDebounce)
    const offset = getOffset(event)
    batchedOffset = Array.isArray(offset)
      ? offset.map((v, i) => (batchedOffset ? v + batchedOffset[i] : v))
      : (batchedOffset ?? 0) + offset
    inDebounce = setTimeout(() => {
      func(batchedOffset)
      batchedOffset = null
    }, delay)
  }
}

const MapContainer = ({ sx, children, onDrag, onScroll }) => {
  const container = useRef(null)
  const moveListener = useRef(null)
  const [cursor, setCursor] = useState('grab')

  useEffect(() => {
    const wheelListener = batcher(onScroll, (event) => event.deltaY / -48, 10)
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
    moveListener.current = batcher(
      onDrag,
      (event) => [event.movementX / width, event.movementY / height],
      10
    )
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
