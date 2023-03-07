import { useEffect, useState } from 'react'
import { useThemedColormap } from '@carbonplan/colormaps'

import { Raster } from './minimap'
import useStore from './store'

const Tile = ({ chunkKey }) => {
  const colormapName = useStore((state) => state.colormap)
  const colormap = useThemedColormap(colormapName, {
    count: 255,
    format: 'rgb',
  })
  const { northPole, nullValue } = useStore((state) => state.variable)
  const clim = useStore((state) => state.clim)
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

  return (
    data && (
      <Raster
        source={data}
        bounds={chunk?.bounds}
        northPole={northPole}
        colormap={colormap}
        mode={'lut'}
        clim={clim}
        nullValue={nullValue}
      />
    )
  )
}

export default Tile
