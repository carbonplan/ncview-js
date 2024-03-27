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

  const selectorLines = selectors
    .map((selector, index) => ({ selector, index }))
    .filter(
      ({ selector, index }) =>
        typeof selector.chunk === 'number' && shape[index] > 1
    )

  if (selectorLines.length === 0) {
    return <RegionSummary />
  }

  return <RegionChart />
}

export default Plots
