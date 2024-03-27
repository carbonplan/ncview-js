import React from 'react'

import useStore from '../data/store'
import { getLines } from '../utils/data'
import LineChart from './line-chart'

const PointPlot = ({ selector, index }) => {
  const plotCenter = useStore((state) => state.plotCenter)
  const chunksToRender = useStore((state) => state.chunksToRender)
  const chunks = useStore((state) => state.dataset.level.chunks)
  const variable = useStore((state) => state.dataset.level.variable)
  const selectors = useStore((state) => state.selectors)

  if (!plotCenter) {
    return null
  }

  const { range, coords, points } = getLines(plotCenter, selector, {
    activeChunkKeys: chunksToRender,
    chunks,
    variable,
    selectors,
  })

  return (
    <LineChart
      selector={selector}
      range={range}
      centerPoint={coords[0]}
      yValues={points[0]}
      index={index}
    />
  )
}

export default PointPlot
