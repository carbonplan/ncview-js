import { useEffect, useState } from 'react'
import { Box } from 'theme-ui'

const Loading = () => {
  const [counter, setCounter] = useState(1)

  const increment = () => {
    return setTimeout(() => {
      setCounter((prev) => (prev % 3) + 1)
      increment()
    }, 1000)
  }
  useEffect(() => {
    let timeout

    timeout = increment()
    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return (
    <Box
      sx={{
        fontFamily: 'mono',
        letterSpacing: 'mono',
        color: 'secondary',
        position: 'relative',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      Loading
      <Box as='span' sx={{ position: 'absolute' }}>
        {Array(counter).fill('.').join('')}
      </Box>
    </Box>
  )
}

export default Loading
