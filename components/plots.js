import { Box, Flex, Label, Radio } from 'theme-ui'
import { SidebarFooter } from '@carbonplan/layouts'
import { useCallback } from 'react'
import { Search, X } from '@carbonplan/icons'
import AnimateHeight from 'react-animate-height'

import useStore from './store'

const sx = {
  radioLabel: {
    '&:hover': { cursor: 'pointer' },
    fontFamily: 'mono',
    letterSpacing: 'mono',
    fontSize: [1, 1, 1, 2],
    textTransform: 'uppercase',
    mt: '3px',
    position: 'relative',
  },
  radio: {
    color: 'muted',
    transition: 'color 0.15s',
    mt: ['-3px', '-3px', '-3px', '-1px'],
    'input:hover ~ &': { color: 'primary' },
    'input:focus ~ &': { background: 'none' },
    'input:focus-visible ~ &': {
      outline: 'dashed 1px rgb(110, 110, 110, 0.625)',
      background: 'rgb(110, 110, 110, 0.625)',
    },
  },
}

const Plots = () => {
  const mode = useStore((state) => state.mode)
  const setMode = useStore((state) => state.setMode)

  const handleClick = useCallback(() => {
    setMode(mode === 'explore' ? 'plot' : 'explore')
  }, [mode])

  return (
    <SidebarFooter onClick={handleClick}>
      <Flex
        sx={{
          fontSize: 2,
          fontFamily: 'heading',
          textTransform: 'uppercase',
          letterSpacing: 'mono',
        }}
      >
        Plots
        <Box sx={{ position: 'relative', ml: [2], mt: '-1px' }}>
          {mode !== 'plot' && <Search sx={{ strokeWidth: 2, width: '18px' }} />}
          {mode === 'plot' && <X sx={{ strokeWidth: 2, width: '18px' }} />}
        </Box>
      </Flex>
      <AnimateHeight
        duration={150}
        height={mode === 'plot' ? 'auto' : 0}
        easing={'linear'}
        style={{ pointerEvents: 'none' }}
      >
        <Box sx={{ pt: [1], pb: [2] }}>
          <Box sx={{ pointerEvents: 'all' }}>
            <Flex>
              <Label sx={sx.radioLabel}>
                <Radio sx={sx.radio} name='plot' />
                Point
              </Label>
              <Label sx={sx.radioLabel}>
                <Radio sx={sx.radio} name='plot' />
                Circle
              </Label>
              <Label sx={sx.radioLabel}>
                <Radio sx={sx.radio} name='plot' disabled />
                Polygon
              </Label>
            </Flex>
          </Box>
        </Box>
      </AnimateHeight>
    </SidebarFooter>
  )
}

export default Plots
