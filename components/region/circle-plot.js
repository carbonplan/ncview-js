import React from 'react'

import useStore from '../data/store'
import { isNullValue } from '../utils/data'
import LineChart from './line-chart'

const average = (arr, variable, coords) => {
  return (
    arr.reduce((s, d) => s + (!isNullValue(d, variable) ? d : 0), 0) /
    arr.length
  )
}

const CirclePlot = ({ selector, index }) => {
  const plotData = useStore((state) => state.plotData)
  const variable = useStore((state) => state.dataset.level.variable)
  const selectors = useStore((state) => state.selectors)

  if (!plotData?.value || !plotData.value[variable.name]) {
    return
  }

  const selectorData = selectors.reduce((data, { index, name, metadata }) => {
    if (name === selector.name) {
      // Grab all values for the active `selector` (should become x-axis)
      return data
    } else if (typeof index !== 'number') {
      // If spatial variable, also just grab data
      return data
    } else {
      // Otherwise, index into the data at the active selector value
      return data[metadata.array.data[index]]
    }
  }, plotData.value[variable.name])

  if (!selectorData) {
    return null
  }

  const unweighted =
    selectorData &&
    plotData.value.coordinates[selector.name].map((coord, i) => {
      return average(selectorData[coord], variable)
    })

  const range = unweighted.reduce(
    ([min, max], d) => [Math.min(d, min), Math.max(d, max)],
    [Infinity, -Infinity]
  )

  return (
    <LineChart
      selector={selector}
      range={range}
      yValues={unweighted}
      index={index}
    />
  )
}

export default CirclePlot
