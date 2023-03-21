import {
  Axis,
  AxisLabel,
  Chart,
  Circle,
  Line,
  Plot,
  TickLabels,
  Ticks,
} from '@carbonplan/charts'
import { Box, Flex } from 'theme-ui'
import unpack from 'ndarray-unpack'
import { format } from 'd3-format'

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
const getPoints = (
  center,
  selector,
  { activeChunkKeys, chunks, variable, selectors }
) => {
  const result = { points: [], values: [], range: [Infinity, -Infinity] }
  const selectedChunks = activeChunkKeys.filter(
    (c) => chunks[c] && inBounds(center, chunks[c].bounds)
  )

  const { chunk_separator, axes, chunk_shape } = variable
  selectedChunks.forEach((chunkKey) => {
    const chunkKeyArray = toKeyArray(chunkKey, { chunk_separator })
    const { clim, bounds, data } = chunks[chunkKey]
    result.range = [
      Math.min(result.range[0], clim[0]),
      Math.max(result.range[1], clim[1]),
    ]

    const spatialIndices = [
      { axis: axes.X, key: 'lon', coord: center[0] },
      { axis: axes.Y, key: 'lat', coord: center[1] },
    ].map(({ axis, key, coord }) => {
      const { step } = axis
      // const start = Math.floor(coord - bounds[key][0]) / step
      // const end = Math.ceil(coord - bounds[key][0]) / step

      return Math.round(coord - bounds[key][0]) / step
    })

    const values = data.pick(
      ...selectors.map((s, i) => {
        if (s.name === selector.name) {
          // return all values for selector being plotted
          return null
        } else if (i === axes.X.index) {
          // return selected index for X dimensions
          return spatialIndices[0]
        } else if (i === axes.Y.index) {
          // return selected index for Y dimension
          return spatialIndices[1]
        } else {
          // return displayed index for all other dimensions
          return selector.index
        }
      })
    )

    result.points.push([
      axes.X.array.data[
        chunk_shape[axes.X.index] * chunkKeyArray[axes.X.index] +
          spatialIndices[0]
      ],
      axes.Y.array.data[
        chunk_shape[axes.Y.index] * chunkKeyArray[axes.Y.index] +
          spatialIndices[1]
      ],
    ])
    result.values.push(unpack(values))
  })
  return result
}

const LineChart = ({ selector, index }) => {
  const center = useStore((state) => state.center)
  const activeChunkKeys = useStore((state) => state.activeChunkKeys)
  const chunks = useStore((state) => state.chunks)
  const variable = useStore((state) => state.variable)
  const metadata = useStore((state) => state.metadata?.metadata)
  const selectors = useStore((state) => state.variable.selectors)

  const { range, points, values } = getPoints(center, selector, {
    activeChunkKeys,
    chunks,
    variable,
    selectors,
  })
  const chunk_shape = variable.chunk_shape[index]
  const offset = selector.chunk * chunk_shape
  const domain = [offset, offset + chunk_shape - 1]

  return (
    <Box sx={{ width: '100%', height: '200px', mt: 3 }}>
      {points[0] && (
        <Flex
          sx={{
            fontFamily: 'mono',
            letterSpacing: 'mono',
            textTransform: 'uppercase',
            fontSize: 0,
            mb: 3,
            gap: 2,
          }}
        >
          <Box sx={{ color: 'secondary', display: 'inline-block' }}>lon:</Box>{' '}
          {format('.1f')(points[0][0])}°,
          <Box sx={{ color: 'secondary', display: 'inline-block' }}>
            lat:
          </Box>{' '}
          {format('.1f')(points[0][1])}°
        </Flex>
      )}

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
          {values[0] && (
            <Line
              data={values[0]
                .map((d, i) =>
                  d === variable.nullValue ? null : [offset + i, d]
                )
                .filter(Boolean)}
            />
          )}
          {values[0] && (
            <Circle x={offset + selector.index} y={values[0][selector.index]} />
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
