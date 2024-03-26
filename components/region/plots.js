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
import React, { useCallback } from 'react'

import useStore from '../data/store'
import { getLines } from '../utils/data'
import DateTickLabel from './date-tick-label'
import { Button } from '@carbonplan/components'
import { Down } from '@carbonplan/icons'

const isNullValue = (p, variable) => {
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
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <Box>
        <Box sx={{ color: 'secondary', display: 'inline-block' }}>lon:</Box>{' '}
        {format('.1f')(point[0])}°
      </Box>
      <Box sx={{ color: 'secondary' }}>,</Box>
      <Box>
        <Box sx={{ color: 'secondary', display: 'inline-block' }}>lat:</Box>{' '}
        {format('.1f')(point[1])}°
      </Box>
      {extraCoords.map((c) => (
        <React.Fragment key={c.name}>
          <Box sx={{ color: 'secondary' }}>,</Box>
          <Box sx={{ color: 'secondary', display: 'inline-block' }}>
            {c.name}:
          </Box>{' '}
          {c.index}
        </React.Fragment>
      ))}
    </Flex>
  )
}

const LineChart = ({ selector, index }) => {
  const plotCenter = useStore((state) => state.plotCenter)
  const chunksToRender = useStore((state) => state.chunksToRender)
  const chunks = useStore((state) => state.dataset.level.chunks)
  const variable = useStore((state) => state.dataset.level.variable)
  const { units } = useStore((state) => state.dataset.getZattrs(variable.name))
  const { units: selectorUnits } = useStore((state) =>
    state.dataset.getZattrs(selector.name)
  )
  const selectors = useStore((state) => state.selectors)
  const { array, cfAxis } = useStore((state) => state.selectors[index].metadata)
  const isTime = cfAxis === 'T'

  const { range, coords, points } = getLines(plotCenter, selector, {
    activeChunkKeys: chunksToRender,
    chunks,
    variable,
    selectors,
  })
  const chunk_shape = variable.chunk_shape[index]
  const offset = selector.chunk * chunk_shape
  const domain = [offset, offset + chunk_shape - 1]

  const formatter = useCallback(
    (x) => {
      if (!array) {
        return ''
      } else if (array.data[x]) {
        if (isTime) {
          return (
            <DateTickLabel name={selector.name} array={array.data} index={x} />
          )
        } else {
          return Number(array.data[x])
        }
      } else {
        return ''
      }
    },
    [selector.name, array, offset, chunk_shape, isTime]
  )

  const handleDownload = useCallback(
    (e) => {
      e.stopPropagation()
      if (!array) {
        return
      }

      const rows = points[0]
        .map((d, i) =>
          d === variable.nullValue ? null : [Number(array.data[offset + i]), d]
        )
        .filter(Boolean)

      if (rows.length === 0) {
        return
      }

      rows.unshift([selector.name, variable.name])
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        rows.map((row) => row.join(',')).join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute(
        'download',
        `${variable.name}-${format('.1f')(coords[0][0])}-${format('.1f')(
          coords[0][1]
        )}.csv`
      )
      document.body.appendChild(link)

      link.click()
      document.body.removeChild(link)
    },
    [
      points[0],
      coords[0],
      array,
      selector.name,
      variable.name,
      variable.nullValue,
      offset,
    ]
  )

  return (
    <Box sx={{ width: '100%', height: '200px', mt: 2, mb: 5 }}>
      <Flex sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        {coords[0] && <Point point={coords[0]} selector={selector} />}
        <Flex sx={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button
            suffix={<Down />}
            sx={{ fontSize: 1, pointerEvents: 'all' }}
            onClick={handleDownload}
            inverted
          >
            Download CSV
          </Button>
        </Flex>
      </Flex>
      <Chart x={domain} y={range}>
        <Axis left bottom />
        <AxisLabel
          left
          units={
            units && (
              <Box
                sx={{
                  wordBreak: units?.includes(' ') ? 'break-word' : 'break-all',
                }}
              >
                {units}
              </Box>
            )
          }
        >
          {variable.name}
        </AxisLabel>
        <AxisLabel bottom units={isTime ? null : selectorUnits}>
          {selector.name}
        </AxisLabel>
        <Ticks left bottom />
        <TickLabels left />
        <TickLabels bottom format={formatter} />
        <Grid vertical horizontal />
        <Plot>
          {points[0] && points[0].some((d) => !isNullValue(d, variable)) && (
            <Line
              data={points[0]
                .map((d, i) =>
                  d === variable.nullValue ? null : [offset + i, d]
                )
                .filter(Boolean)}
            />
          )}
          {points[0] && !isNullValue(points[0][selector.index], variable) && (
            <Circle x={offset + selector.index} y={points[0][selector.index]} />
          )}
        </Plot>
        {points[0] && !isNullValue(points[0][selector.index], variable) && (
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
  const plotCenter = useStore((state) => state.plotCenter)
  const chunksToRender = useStore((state) => state.chunksToRender)
  const chunks = useStore((state) => state.dataset.level.chunks)
  const variable = useStore((state) => state.dataset.level.variable)
  const { units } = useStore((state) => state.dataset.getZattrs(variable.name))
  const selectors = useStore((state) => state.selectors)

  const { coords, points } = getLines(
    plotCenter,
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
        {isNullValue(points[0], variable) ? (
          <Box sx={{ color: 'secondary', display: 'inline-block' }}>
            not defined
          </Box>
        ) : (
          <>
            {format('.1f')(points[0])} {units}
          </>
        )}
      </Flex>
    </Box>
  )
}

const Plots = () => {
  const variable = useStore((state) => state.dataset.level.variable?.name)
  const selectors = useStore((state) => state.selectors)
  const shape = useStore((state) => state.dataset.level.variable.shape)

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
    return <PointInformation />
  }

  return (
    <>
      {selectorLines.map(({ selector, index }) => (
        <LineChart key={selector.name} selector={selector} index={index} />
      ))}
    </>
  )
}

export default Plots
