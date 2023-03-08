import { useEffect, useState } from 'react'

import { Tile } from './minimap'
import useStore from './store'

const Chunk = ({ chunkKey }) => {
  const fetchChunk = useStore((state) => state.fetchChunk)

  const chunk = useStore((state) => state.chunks[chunkKey])
  const selectors = useStore((state) => state.variable.selectors)

  const [data, setData] = useState(null)

  useEffect(() => {
    if (!chunk) {
      // fetch chunk
      fetchChunk(chunkKey)
    } else {
      // process chunk
      setData(chunk.data.pick(...selectors.map((d) => d.index)))
    }
  }, [chunkKey, chunk, selectors])

  return data && <Tile id={chunkKey} source={data} bounds={chunk?.bounds} />
}

export default Chunk
