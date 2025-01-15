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
import React, { useCallback } from 'react'
import { Button } from '@carbonplan/components'
import { Down } from '@carbonplan/icons'

import useStore from '../data/store'
import { isNullValue } from '../utils/data'
import DateTickLabel from './date-tick-label'
import RegionInfo from './region-info'
import { formatValue } from '../utils/display'

const LineChart = ({ selector, range, centerPoint, yValues, index }) => {
  const variable = useStore((state) => state.dataset.level.variable)
  const { units } = useStore((state) => state.dataset.getZattrs(variable.name))
  const { units: selectorUnits } = useStore(
    (state) => state.dataset.getZattrs(selector.name) ?? {}
  )
  const { array, cfAxis } = useStore((state) => state.selectors[index].metadata)
  const isTime = cfAxis === 'T'

  const chunk_shape = variable.chunk_shape[index]
  const offset = selector.chunk * chunk_shape
  const domain = [offset, offset + chunk_shape - 1]

  const formatter = useCallback(
    (x) => {
      if (!array) {
        return `Index=${x}`
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

      const rows = yValues.map((d, i) => [
        array ? Number(array.data[offset + i]) : offset + i,
        d === variable.nullValue ? null : d,
      ])

      if (rows.length === 0) {
        return
      }

      rows.unshift([
        array ? selector.name : `${selector.name} (index)`,
        variable.name,
      ])
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        rows.map((row) => row.join(',')).join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      const suffix = centerPoint
        ? `${formatValue(centerPoint[0], range)}-${formatValue(
            centerPoint[1],
            range
          )}`
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
      range,
    ]
  )

  return (
    <Box sx={{ my: 2 }}>
      <Flex sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <RegionInfo selector={selector} />
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
      <Box sx={{ mt: 2, width: '100%', height: '200px' }}>
        <Chart x={domain} y={range}>
          <Axis left bottom />
          <AxisLabel
            left
            units={
              units && (
                <Box
                  sx={{
                    wordBreak: units?.includes(' ')
                      ? 'break-word'
                      : 'break-all',
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
              {formatValue(yValues[selector.index], range)} {units}
            </Label>
          )}
        </Chart>
      </Box>
    </Box>
  )
}

export default LineChart
