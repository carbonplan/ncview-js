import { Box, Flex } from 'theme-ui'
import { format } from 'd3-format'
import React from 'react'

import PointSummary from './point-summary'
import useStore from '../data/store'
import { isNullValue } from '../utils/data'

const RegionSummary = ({ selector }) => {
  const plotData = useStore((state) => state.plotData)
  const plotMode = useStore((state) => state.plotMode)
  const variable = useStore((state) => state.dataset.level.variable)
  const { units } = useStore((state) => state.dataset.getZattrs(variable.name))

  if (!plotData) {
    return
  }

  const { yValues, centerPoint } = plotData

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      {centerPoint && <PointSummary point={centerPoint} selector={selector} />}

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
        <Box sx={{ color: 'secondary', display: 'inline-block' }}>
          {plotMode === 'circle' ? 'average value:' : 'value:'}
        </Box>
        {!yValues || isNullValue(yValues[0], variable) ? (
          <Box sx={{ color: 'secondary', display: 'inline-block' }}>
            not defined
          </Box>
        ) : (
          <>
            {format('.1f')(yValues[0])} {units}
          </>
        )}
      </Flex>
    </Box>
  )
}

export default RegionSummary
