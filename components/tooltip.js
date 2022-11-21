import { Box, Flex, IconButton } from 'theme-ui'
import { useState } from 'react'
import AnimateHeight from 'react-animate-height'
import { Info } from '@carbonplan/icons'

export const TooltipWrapper = ({
  align = 'flex-start',
  mt = '6px',
  justify,
  children,
  expanded,
  setExpanded,
}) => {
  return (
    <Flex sx={{ gap: 2, alignItems: align, justifyContent: justify }}>
      {children}
      <IconButton
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(!expanded)
        }}
        role='checkbox'
        aria-checked={expanded}
        aria-label='Information'
        sx={{
          cursor: 'pointer',
          height: '16px',
          width: '16px',
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover > #info': {
              stroke: 'primary',
            },
          },
          p: [0],
          transform: 'translate(0px, -3.75px)',
          mt,
          flexShrink: 0,
        }}
      >
        <Info
          id='info'
          height='16px'
          width='16px'
          sx={{
            stroke: expanded ? 'primary' : 'secondary',
            transition: '0.1s',
          }}
        />
      </IconButton>
    </Flex>
  )
}

export const TooltipContent = ({ expanded, children, sx }) => {
  return (
    <AnimateHeight
      duration={100}
      height={expanded ? 'auto' : 0}
      easing={'linear'}
    >
      <Box sx={{ py: 1, fontSize: [1, 1, 1, 2], color: 'secondary', ...sx }}>
        {children}
      </Box>
    </AnimateHeight>
  )
}
const Tooltip = ({ children, tooltip, mt, sx, align, justify }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <Box sx={sx}>
      <TooltipWrapper
        expanded={expanded}
        setExpanded={setExpanded}
        align={align}
        justify={justify}
        mt={mt}
      >
        {children}
      </TooltipWrapper>
      <TooltipContent expanded={expanded}>{tooltip}</TooltipContent>
    </Box>
  )
}

export default Tooltip
