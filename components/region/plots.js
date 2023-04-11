import {
  Axis,
  AxisLabel,
  Chart,
  Circle,
  Grid,
  Label,
  Line,
  Plot,
  TickLabels,
  Ticks,
} from '@carbonplan/charts'
import { Box, Flex } from 'theme-ui'
import { format } from 'd3-format'
import { useCallback, useEffect, useState } from 'react'

import useStore from '../store'
import { getLines } from '../utils'

const isNullValue = (p) => {
  return p == null || p === variable.nullValue || Number.isNaN(p)
}

const Point = ({ point, selector }) => {
  const selectors = useStore((state) => state.selectors)
  const extraCoords = selectors.filter(
    (s) => typeof s.index === 'number' && s.name !== selector?.name
  )

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
      {format('.1f')(point[0])}°
      <Box sx={{ color: 'secondary', display: 'inline-block' }}>, lat:</Box>{' '}
      {format('.1f')(point[1])}°
      {extraCoords.map((c) => (
        <Box key={c.name}>
          <Box sx={{ color: 'secondary', display: 'inline-block' }}>
            , {c.name}:
          </Box>{' '}
          {c.index}
        </Box>
      ))}
    </Flex>
  )
}

const LineChart = ({ selector, index }) => {
  const center = useStore((state) => state.center)
  const chunksToRender = useStore((state) => state.chunksToRender)
  const chunks = useStore((state) => state.dataset.level.chunks)
  const variable = useStore((state) => state.dataset.variable)
  const metadata = useStore((state) => state.dataset.metadata?.metadata)
  const selectors = useStore((state) => state.selectors)
  const array = useStore((state) => state.dataset.arrays[selector.name])
  const headers = useStore((state) => state.dataset.headers)

  const [selectorArray, setSelectorArray] = useState(null)
  const { range, coords, points } = getLines(center, selector, {
    activeChunkKeys: chunksToRender,
    chunks,
    variable,
    selectors,
  })
  const chunk_shape = variable.chunk_shape[index]
  const offset = selector.chunk * chunk_shape
  const units = metadata[`${variable.name}/.zattrs`].units
  const domain = [offset, offset + chunk_shape - 1]

  useEffect(() => {
    array.get_chunk([0], { headers }).then((result) => {
      setSelectorArray(result.data)
    })
  }, [array, offset])

  const formatter = useCallback(
    (x) => {
      if (!selectorArray) {
        return ''
      } else if (selectorArray[x]) {
        return Number(selectorArray[x])
      } else {
        return ''
      }
    },
    [selectorArray, offset, chunk_shape]
  )

  return (
    <Box sx={{ width: '100%', height: '200px', mt: 2, mb: 5 }}>
      {coords[0] && <Point point={coords[0]} selector={selector} />}
      <Chart x={domain} y={range}>
        <Axis left bottom />
        <AxisLabel
          left
          units={
            <Box
              sx={{
                wordBreak: units?.includes(' ') ? 'break-word' : 'break-all',
              }}
            >
              {units}
            </Box>
          }
        >
          {variable.name}
        </AxisLabel>
        <AxisLabel bottom units={metadata[`${selector.name}/.zattrs`].units}>
          {selector.name}
        </AxisLabel>
        <Ticks left bottom />
        <TickLabels left />
        <TickLabels bottom format={formatter} />
        <Grid vertical horizontal />
        <Plot>
          {points[0] && points[0].some((d) => !isNullValue(d)) && (
            <Line
              data={points[0]
                .map((d, i) =>
                  d === variable.nullValue ? null : [offset + i, d]
                )
                .filter(Boolean)}
            />
          )}
          {points[0] && !isNullValue(points[0][selector.index]) && (
            <Circle x={offset + selector.index} y={points[0][selector.index]} />
          )}
        </Plot>
        {points[0] && !isNullValue(points[0][selector.index]) && (
          <Label
            x={offset + selector.index}
            y={points[0][selector.index]}
            sx={{ mt: 2, ml: 1, color: 'primary' }}
          >
            {format('.1f')(points[0][selector.index])} {units}
          </Label>
        )}
      </Chart>
    </Box>
  )
}

const PointInformation = ({ selector }) => {
  const center = useStore((state) => state.center)
  const chunksToRender = useStore((state) => state.chunksToRender)
  const chunks = useStore((state) => state.dataset.level.chunks)
  const variable = useStore((state) => state.dataset.variable)
  const metadata = useStore((state) => state.dataset.metadata.metadata)
  const selectors = useStore((state) => state.selectors)

  const { coords, points } = getLines(
    center,
    {},
    {
      activeChunkKeys: chunksToRender,
      chunks,
      variable,
      selectors,
    }
  )

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      {coords[0] && <Point point={coords[0]} selector={selector} />}

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
        {isNullValue(points[0]) ? (
          <Box sx={{ color: 'secondary', display: 'inline-block' }}>
            not defined
          </Box>
        ) : (
          <>
            {format('.1f')(points[0])}{' '}
            {metadata[`${variable.name}/.zattrs`].units}
          </>
        )}
      </Flex>
    </Box>
  )
}

const Plots = () => {
  const selectors = useStore((state) => state.selectors)

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
