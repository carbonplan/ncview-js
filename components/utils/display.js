import { scaleLinear, tickFormat } from 'd3-scale'

export const formatValue = (value, range) => {
  const formatter = tickFormat(range[0], range[1], 10)
  return formatter(value)
}

export const getClimStep = (clim) => {
  const ticks = scaleLinear(clim, [0, 1]).ticks(25)
  return Math.abs(ticks[1] - ticks[0])
}
