import React from 'react'

import useStore from '../data/store'
import RegionSummary from './region-summary'
import PointPlot from './point-plot'
import CirclePlot from './circle-plot'

const Plots = () => {
  const variable = useStore((state) => state.dataset.level.variable?.name)
  const selectors = useStore((state) => state.selectors)
  const plotMode = useStore((state) => state.plotMode)
  const shape = useStore((state) => state.dataset.level.variable.shape)

  if (!variable) {
    return
  }

  const selectorLines = selectors
    .map((selector, index) => ({ selector, index }))
    .filter(
      ({ selector, index }) =>
        typeof selector.chunk === 'number' && shape[index] > 1
    )

  if (selectorLines.length === 0) {
    return <RegionSummary />
  }

  const Component = plotMode === 'point' ? PointPlot : CirclePlot

  return (
    <>
      {selectorLines.map(({ selector, index }) => (
        <Component key={selector.name} selector={selector} index={index} />
      ))}
    </>
  )
}

export default Plots
