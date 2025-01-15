import { Box, Flex } from 'theme-ui'
import React from 'react'

import RegionInfo from './region-info'
import useStore from '../data/store'
import { isNullValue } from '../utils/data'
import { formatValue } from '../utils/display'

const RegionSummary = () => {
  const clim = useStore((state) => state.clim)
  const plotData = useStore((state) => state.plotData)
  const plotMode = useStore((state) => state.plotMode)
  const variable = useStore((state) => state.dataset.level.variable)
  const { units } = useStore((state) => state.dataset.getZattrs(variable.name))

  if (!plotData) {
    return
  }

  const { yValues } = plotData

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      <RegionInfo />

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
            {formatValue(yValues[0], clim)} {units}
          </>
        )}
      </Flex>
    </Box>
  )
}

export default RegionSummary
