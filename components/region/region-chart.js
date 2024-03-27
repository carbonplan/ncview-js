import React from 'react'

import useStore from '../data/store'
import LineChart from './line-chart'

const RegionChart = () => {
  const plotData = useStore((state) => state.plotData)
  const selectors = useStore((state) => state.selectors)

  if (!plotData) {
    return
  }

  const { range, yValues, selectorName, centerPoint, circleInfo } = plotData

  if (!selectorName) {
    return
  }

  const { selector, index } = selectors
    .map((selector, index) => ({ selector, index }))
    .find(({ selector }) => selector.name === selectorName)

  return (
    <LineChart
      centerPoint={circleInfo?.centerPoint ?? centerPoint}
      selector={selector}
      range={range}
      yValues={yValues}
      index={index}
    />
  )
}

export default RegionChart
