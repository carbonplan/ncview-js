import { Slider } from '@carbonplan/components'
import { Box, Flex, IconButton } from 'theme-ui'
import { useCallback, useState } from 'react'

import Label from './label'
import useStore from './store'
import Next from './icons/next'
import Back from './icons/back'
import Play from './icons/play'
import Pause from './icons/pause'

const sx = {
  subLabel: {
    fontFamily: 'mono',
    letterSpacing: 'mono',
    color: 'secondary',
    fontSize: 1,
  },
}

const Selector = ({ index }) => {
  const [playing, setPlaying] = useState(false)
  const selector = useStore(
    (state) => state.variable.selectors && state.variable.selectors[index]
  )
  const setSelector = useStore((state) => state.setSelector)
  const chunk_shape = useStore((state) => state.variable.chunk_shape)
  const finalChunk = useStore(
    (state) =>
      Math.ceil(
        state.variable.shape[index] / state.variable.chunk_shape[index]
      ) - 1
  )

  const setSelectorIndex = useCallback(
    (value) => {
      setSelector(index, { index: value })
    },
    [index]
  )

  return (
    <Label value={selector.name} direction='vertical'>
      <Flex sx={{ flexDirection: 'column', gap: 4, mt: 3 }}>
        <Box>
          <Flex sx={{ gap: 3, pb: 1 }}>
            <IconButton
              aria-label={`Play across ${selector.name} dimension`}
              onClick={() => setPlaying(true)}
              disabled={playing}
              sx={{
                color: !playing ? 'primary' : 'secondary',
                padding: 0,
                cursor: 'pointer',
                width: 14,
                height: 16,
              }}
            >
              <Play />
            </IconButton>

            <IconButton
              aria-label={`Pause across ${selector.name} dimension`}
              onClick={() => setPlaying(false)}
              disabled={!playing}
              sx={{
                color: playing ? 'primary' : 'secondary',
                padding: 0,
                cursor: 'pointer',
                width: 14,
                height: 16,
              }}
            >
              <Pause />
            </IconButton>
            <Box sx={{ ...sx.subLabel, pb: 1 }}>
              step{' '}
              <Box as='span' sx={{ color: 'primary' }}>
                {selector.index}
              </Box>{' '}
              / {chunk_shape[index]}
            </Box>
          </Flex>

          <Slider
            value={selector.index}
            min={0}
            max={chunk_shape[index]}
            onChange={(e) => setSelectorIndex(parseFloat(e.target.value))}
            step={1}
          />
        </Box>

        <Flex sx={{ gap: 3 }}>
          <IconButton
            aria-label={`View previous ${selector.name} chunk`}
            onClick={() => {
              setSelector(index, { chunk: selector.chunk - 1 })
            }}
            disabled={selector.chunk === 0}
            sx={{
              color: selector.chunk > 0 ? 'primary' : 'secondary',
              padding: 0,
              cursor: 'pointer',
              width: 16,
              height: 16,
            }}
          >
            <Back />
          </IconButton>

          <IconButton
            aria-label={`View next ${selector.name} chunk`}
            onClick={() => {
              setSelector(index, { chunk: selector.chunk + 1 })
            }}
            disabled={selector.chunk === finalChunk}
            sx={{
              color: selector.chunk < finalChunk ? 'primary' : 'secondary',
              padding: 0,
              cursor: 'pointer',
              width: 16,
              height: 16,
            }}
          >
            <Next />
          </IconButton>

          <Box sx={sx.subLabel}>
            chunk{' '}
            <Box as='span' sx={{ color: 'primary' }}>
              {selector.chunk}
            </Box>{' '}
            / {finalChunk}
          </Box>
        </Flex>
      </Flex>
    </Label>
  )
}

export default Selector
