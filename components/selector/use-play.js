import { useEffect, useRef, useState } from 'react'

import useStore from '../store'

const usePlay = (index, { incrementChunk = false } = {}) => {
  const [playing, setPlaying] = useState(false)
  const selector = useStore(
    (state) => state.selectors && state.selectors[index]
  )
  const setSelector = useStore((state) => state.setSelector)
  const chunk_shape = useStore(
    (state) => state.dataset.level.variable.chunk_shape[index]
  )
  const shape = useStore((state) => state.dataset.level.variable.shape[index])
  const intervalId = useRef(null)

  useEffect(() => {
    if (playing) {
      let value = { index: selector.index, chunk: selector.chunk }

      const incrementValue = () => {
        const rawValue = value.chunk * chunk_shape + value.index + 1

        if (rawValue > shape - 1) {
          value = { index: 0, chunk: 0 }
        } else {
          const updatedIndex = rawValue % chunk_shape

          const updatedChunk =
            updatedIndex === 0
              ? // Increment chunk and possibly return to 0th chunk
                (value.chunk + 1) % Math.ceil(shape / chunk_shape)
              : // Or return existing chunk
                value.chunk

          value = {
            index: updatedIndex,
            chunk: incrementChunk ? updatedChunk : value.chunk,
          }
        }

        setSelector(index, value)
      }

      intervalId.current = setInterval(incrementValue, 1000)
    }

    if (!playing && intervalId.current) {
      clearInterval(intervalId.current)
      intervalId.current = null
    }

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current)
        intervalId.current = null
      }
    }
  }, [index, chunk_shape, shape, playing, incrementChunk])

  return [playing, setPlaying]
}

export default usePlay
