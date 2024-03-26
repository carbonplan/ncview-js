import { Box, Flex } from 'theme-ui'
import { SidebarFooter } from '@carbonplan/layouts'
import { useCallback, useEffect } from 'react'
import { Search, X } from '@carbonplan/icons'
import AnimateHeight from 'react-animate-height'

import useStore from './data/store'
import { Plots as RegionalPlots } from './region'

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
  const ready = useStore((state) => !!state.dataset)
  const pyramid = useStore((state) => state.dataset?.pyramid)
  const plotMode = useStore((state) => state.plotMode)
  const plotCenter = useStore((state) => state.plotCenter)
  const setPlotMode = useStore((state) => state.setPlotMode)
  const setPlotCenter = useStore((state) => state.setPlotCenter)
  const selectors = useStore((state) => state.selectors)

  const handleClick = useCallback(() => {
    if (plotMode === 'inactive') {
      setPlotMode(pyramid ? 'circle' : 'point')
    } else {
      setPlotMode('inactive')
      setPlotCenter(null)
    }
  }, [plotMode, pyramid])

  useEffect(() => {
    if (!ready) {
      setPlotMode('inactive')
      setPlotCenter(null)
    }
  }, [ready])

  return (
    <SidebarFooter
      sx={{ pointerEvents: ready ? 'all' : 'none', pt: ['20px'], pb: [3] }}
      onClick={handleClick}
    >
      <Box sx={{ transition: 'color 0.15s', opacity: ready ? 1 : 0.3 }}>
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
            {plotMode === 'inactive' && (
              <Search sx={{ strokeWidth: 2, width: '18px' }} />
            )}
            {plotMode !== 'inactive' && (
              <X sx={{ strokeWidth: 2, width: '18px' }} />
            )}
          </Box>
        </Flex>
        <AnimateHeight
          duration={150}
          height={plotMode !== 'inactive' ? 'auto' : 0}
          easing={'linear'}
          style={{ pointerEvents: 'none' }}
        >
          {ready && plotMode !== 'inactive' && plotCenter && selectors && (
            <RegionalPlots />
          )}
        </AnimateHeight>
      </Box>
    </SidebarFooter>
  )
}

export default Plots
