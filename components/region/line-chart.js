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
import { Button } from '@carbonplan/components'
import { Down } from '@carbonplan/icons'

import useStore from '../data/store'
import { isNullValue } from '../utils/data'
import DateTickLabel from './date-tick-label'
import PointSummary from './point-summary'

const LineChart = ({ selector, range, centerPoint, yValues, index }) => {
  const variable = useStore((state) => state.dataset.level.variable)
  const { units } = useStore((state) => state.dataset.getZattrs(variable.name))
  const { units: selectorUnits } = useStore((state) =>
    state.dataset.getZattrs(selector.name)
  )
  const { array, cfAxis } = useStore((state) => state.selectors[index].metadata)
  const isTime = cfAxis === 'T'

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

      const rows = yValues
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
      const suffix = centerPoint
        ? `${format('.1f')(centerPoint[0])}-${format('.1f')(centerPoint[1])}`
        : ''
      link.setAttribute('download', `${variable.name}${suffix}.csv`)
      document.body.appendChild(link)

      link.click()
      document.body.removeChild(link)
    },
    [
      yValues,
      centerPoint,
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
        {centerPoint && (
          <PointSummary point={centerPoint} selector={selector} />
        )}
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
          {yValues && yValues.some((d) => !isNullValue(d, variable)) && (
            <Line
              data={yValues
                .map((y, i) =>
                  isNullValue(y, variable) ? null : [offset + i, y]
                )
                .filter(Boolean)}
            />
          )}
          {yValues && !isNullValue(yValues[selector.index], variable) && (
            <Circle x={offset + selector.index} y={yValues[selector.index]} />
          )}
        </Plot>
        {yValues && !isNullValue(yValues[selector.index], variable) && (
          <Label
            x={offset + selector.index}
            y={yValues[selector.index]}
            sx={{ mt: 2, ml: 1, color: 'primary' }}
            align={selector.index >= chunk_shape / 2 ? 'right' : 'left'}
          >
            {format('.1f')(yValues[selector.index])} {units}
          </Label>
        )}
      </Chart>
    </Box>
  )
}

export default LineChart
