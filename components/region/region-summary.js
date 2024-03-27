import { Box, Flex } from 'theme-ui'
import { format } from 'd3-format'
import React from 'react'

import PointSummary from './point-summary'
import useStore from '../data/store'
import { getLines, isNullValue } from '../utils/data'

const RegionSummary = ({ selector }) => {
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
      {coords[0] && <PointSummary point={coords[0]} selector={selector} />}

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

export default RegionSummary
