import { Box, Flex } from 'theme-ui'
import { format } from 'd3-format'
import React from 'react'

import useStore from '../data/store'

const PointSummary = ({ point, selector }) => {
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

export default PointSummary
