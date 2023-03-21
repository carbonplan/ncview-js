import {
  Axis,
  AxisLabel,
  Chart,
  Line,
  Plot,
  TickLabels,
  Ticks,
} from '@carbonplan/charts'
import { Box } from 'theme-ui'
import unpack from 'ndarray-unpack'

import useStore from '../store'
import { toKeyArray } from '../utils'

const inBounds = (point, bounds) => {
  const [lon, lat] = point

  return (
    bounds.lon[0] <= lon &&
    bounds.lon[1] >= lon &&
    bounds.lat[0] <= lat &&
    bounds.lat[1] >= lat
  )
}

// TODO: avoid returning data when chunk is not yet present in `chunks`
// TODO: handle non-equal area pixels in aggregation
// TODO: handle multiple non-spatial dimensions
// TODO: aggregate clims for use as chart range
const getPoints = (
  center,
  selector,
  { activeChunkKeys, chunks, variable, selectors }
) => {
  const results = []
  const selectedChunks = activeChunkKeys.filter(
    (c) => chunks[c] && inBounds(center, chunks[c].bounds)
  )

  const { chunk_separator, axes, chunk_shape } = variable
  selectedChunks.forEach((chunkKey) => {
    const chunkKeyArray = toKeyArray(chunkKey, { chunk_separator })
    const { bounds, data } = chunks[chunkKey]

    const temp = [
      { axis: axes.X, key: 'lon', coord: center[0] },
      { axis: axes.Y, key: 'lat', coord: center[1] },
    ].map(({ axis, key, coord }) => {
      const { index, step } = axis
      const offset = chunk_shape[index] * chunkKeyArray[index]
      const start = Math.floor(coord - bounds[key][0]) / step
      const end = Math.ceil(coord - bounds[key][0]) / step

      return Math.round(coord - bounds[key][0]) / step
    })

    const values = data.pick(
      ...selectors.map((s, i) => {
        if (s.name === selector.name) {
          // return all values for selector being plotted
          return null
        } else if (i === axes.X.index) {
          // return selected index for X dimensions
          return temp[0]
        } else if (i === axes.Y.index) {
          // return selected index for Y dimension
          return temp[1]
        } else {
          // return displayed index for all other dimensions
          return selector.index
        }
      })
    )

    results.push(unpack(values))
  })
  return results
}

const LineChart = ({ selector, index }) => {
  const center = useStore((state) => state.center)
  const activeChunkKeys = useStore((state) => state.activeChunkKeys)
  const chunks = useStore((state) => state.chunks)
  const variable = useStore((state) => state.variable)
  const metadata = useStore((state) => state.metadata?.metadata)
  const selectors = useStore((state) => state.variable.selectors)

  const [points] = getPoints(center, selector, {
    activeChunkKeys,
    chunks,
    variable,
    selectors,
  })
  const chunk_shape = variable.chunk_shape[index]
  const offset = selector.chunk * chunk_shape
  const domain = [offset, offset + chunk_shape - 1]
  const range = points ? [Math.min(...points), Math.max(...points)] : [0, 0]

  return (
    <Box sx={{ width: '100%', height: '200px', mt: 3 }}>
      <Chart x={domain} y={range}>
        <Axis left bottom />
        <AxisLabel left units={metadata[`${variable.name}/.zattrs`].units}>
          {variable.name}
        </AxisLabel>
        <AxisLabel bottom units={metadata[`${selector.name}/.zattrs`].units}>
          {selector.name}
        </AxisLabel>
        <Ticks left bottom />
        <TickLabels left bottom />
        <Plot>
          {points && (
            <Line
              data={points
                .map((d, i) =>
                  d === variable.nullValue ? null : [offset + i, d]
                )
                .filter(Boolean)}
            />
          )}
        </Plot>
      </Chart>
    </Box>
  )
}

const Charts = () => {
  const selectors = useStore((state) => state.variable.selectors)

  return (
    <>
      {selectors
        .filter((s) => typeof s.chunk === 'number')
        .map((s, i) => (
          <LineChart key={s.name} selector={s} index={i} />
        ))}
    </>
  )
}

export default Charts
