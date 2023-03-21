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
import { format } from 'd3-format'

import useStore from '../store'
import { getLines } from '../utils'

const Point = ({ point }) => {
  return (
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
      {format('.1f')(point[0])}°,
      <Box sx={{ color: 'secondary', display: 'inline-block' }}>lat:</Box>{' '}
      {format('.1f')(point[1])}°
    </Flex>
  )
}

const LineChart = ({ selector, index }) => {
  const center = useStore((state) => state.center)
  const activeChunkKeys = useStore((state) => state.activeChunkKeys)
  const chunks = useStore((state) => state.chunks)
  const variable = useStore((state) => state.variable)
  const metadata = useStore((state) => state.metadata?.metadata)
  const selectors = useStore((state) => state.variable.selectors)

  const { range, coords, points } = getLines(center, selector, {
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
      {coords[0] && <Point point={coords[0]} />}

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
          {points[0] && (
            <Line
              data={points[0]
                .map((d, i) =>
                  d === variable.nullValue ? null : [offset + i, d]
                )
                .filter(Boolean)}
            />
          )}
          {points[0] && (
            <Circle x={offset + selector.index} y={points[0][selector.index]} />
          )}
        </Plot>
      </Chart>
    </Box>
  )
}

const PointInformation = () => {
  const center = useStore((state) => state.center)
  const activeChunkKeys = useStore((state) => state.activeChunkKeys)
  const chunks = useStore((state) => state.chunks)
  const variable = useStore((state) => state.variable)
  const metadata = useStore((state) => state.metadata?.metadata)
  const selectors = useStore((state) => state.variable.selectors)

  const { coords, points } = getLines(
    center,
    {},
    {
      activeChunkKeys,
      chunks,
      variable,
      selectors,
    }
  )

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      {coords[0] && <Point point={coords[0]} />}
      {points[0] != null && (
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
          <Box sx={{ color: 'secondary', display: 'inline-block' }}>value:</Box>
          {format('.1f')(points[0])}{' '}
          {metadata[`${variable.name}/.zattrs`].units}
        </Flex>
      )}
    </Box>
  )
}

const Plots = () => {
  const selectors = useStore((state) => state.variable?.selectors)

  const selectorLines = selectors.filter((s) => typeof s.chunk === 'number')

  if (selectorLines.length === 0) {
    return <PointInformation />
  }

  return (
    <>
      {selectorLines.map((s, i) => (
        <LineChart key={s.name} selector={s} index={i} />
      ))}
    </>
  )
}

export default Plots
