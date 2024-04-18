import React from 'react'

import useStore from '../data/store'
import RegionSummary from './region-summary'
import RegionChart from './region-chart'

const Plots = () => {
  const variable = useStore((state) => state.dataset.level.variable?.name)
  const selectors = useStore((state) => state.selectors)
  const shape = useStore((state) => state.dataset.level.variable?.shape)

  if (!variable) {
    return
  }

  const selectorLines = selectors.filter(
    (selector) =>
      typeof selector.chunk === 'number' &&
      shape[selector.metadata.dimensionIndex] > 1
  )

  if (selectorLines.length === 0) {
    return <RegionSummary />
  }

  return <RegionChart />
}

export default Plots
