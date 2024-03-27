import { isNullValue } from './data'

// TODO: weight by coords
export const average = (arr, variable, coords) => {
  return (
    arr.reduce((s, d) => s + (!isNullValue(d, variable) ? d : 0), 0) /
    arr.length
  )
}

export const getPlotSelector = (selectors, chunk_shape) => {
  return selectors
    .filter(
      (selector) =>
        typeof selector.chunk === 'number' && typeof selector.index === 'number'
    )
    .reduce(
      (maxSoFar, selector) => {
        const chunkSize = chunk_shape[selector.metadata.dimensionIndex]
        if (!maxSoFar.selector || maxSoFar.chunkSize <= chunkSize) {
          return { selector, chunkSize }
        } else {
          return maxSoFar
        }
      },
      { selector: null, chunkSize: 0 }
    ).selector
}
