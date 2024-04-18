import { Box, Flex } from 'theme-ui'
import { format } from 'd3-format'
import React from 'react'

import useStore from '../data/store'

const RegionInfo = () => {
  const plotData = useStore((state) => state.plotData)
  const plotMode = useStore((state) => state.plotMode)

  if (!plotData) {
    return
  }

  let point
  let radius
  let units
  if (plotMode === 'circle') {
    point = plotData.circleInfo.centerPoint
    radius = plotData.circleInfo.radius
    units = plotData.circleInfo.units
  } else {
    point = plotData.centerPoint
  }

  const pointInfo = point && (
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
    </Flex>
  )

  return (
    <Box
      sx={{
        fontFamily: 'mono',
        letterSpacing: 'mono',
        textTransform: 'uppercase',
        fontSize: 0,
        mb: 3,
        flexShrink: 0,
      }}
    >
      <Flex sx={{ flexDirection: 'column', gap: 2 }}>
        {plotMode === 'circle' && <Box>Center</Box>}
        {pointInfo}
      </Flex>

      {radius && (
        <Flex sx={{ flexDirection: 'column', gap: 2 }}>
          Radius
          <Box>
            {format('.1f')(radius)}{' '}
            {units && (
              <Box
                sx={{
                  color: 'secondary',
                  display: 'inline-block',
                  textTransform: 'none',
                }}
              >
                {units}
              </Box>
            )}
          </Box>
        </Flex>
      )}
    </Box>
  )
}

export default RegionInfo
