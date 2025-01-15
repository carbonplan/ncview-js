import { tickFormat } from 'd3-scale'

export const formatValue = (value, range) => {
  const formatter = tickFormat(range[0], range[1], 10)
  return formatter(value)
}
