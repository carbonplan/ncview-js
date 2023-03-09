import { Column, Row, Slider } from '@carbonplan/components'
import { Box, Flex } from 'theme-ui'
import { useCallback, useEffect, useRef, useState } from 'react'

import useStore from './store'
import Label from './label'
import ArrayMetadata from './array-metadata'
import IconButton from './icons/icon-button'
import Next from './icons/next'
import Back from './icons/back'
import Play from './icons/play'
import Pause from './icons/pause'
import { TooltipContent, TooltipWrapper } from './tooltip'
import DateDisplay from './date-display'

const sx = {
  subLabel: {
    fontFamily: 'mono',
    letterSpacing: 'mono',
    color: 'secondary',
    fontSize: 1,
  },
}

const usePlay = (index) => {
  const [playing, setPlaying] = useState(false)
  const selector = useStore(
    (state) => state.variable.selectors && state.variable.selectors[index]
  )
  const setSelector = useStore((state) => state.setSelector)
  const chunk_shape = useStore((state) => state.variable.chunk_shape)
  const intervalId = useRef(null)

  useEffect(() => {
    if (playing) {
      let value = selector.index

      const incrementIndex = () => {
        value = (value + 1) % chunk_shape[index]
        setSelector(index, { index: value })
      }

      intervalId.current = setInterval(incrementIndex, 1000)
    }

    if (!playing && intervalId.current) {
      clearInterval(intervalId.current)
      intervalId.current = null
    }
  }, [playing])

  return [playing, setPlaying]
}

const Selector = ({ index }) => {
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = usePlay(index)
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
    <Label
      value={
        <TooltipWrapper expanded={expanded} setExpanded={setExpanded}>
          {selector.name}
        </TooltipWrapper>
      }
      direction='vertical'
    >
      <TooltipContent expanded={expanded}>
        <ArrayMetadata array={selector.name} />
      </TooltipContent>
      <Flex sx={{ flexDirection: 'column', gap: 1, mt: 3 }}>
        {chunk_shape[index] > 1 && (
          <>
            <Row columns={[4]}>
              <Column start={1} width={[4, 1, 1, 1]}>
                <Flex sx={{ gap: 3 }}>
                  <IconButton
                    aria-label={`Play across ${selector.name} dimension`}
                    onClick={() => setPlaying(true)}
                    disabled={playing}
                    sx={{ width: 14, height: 16 }}
                  >
                    <Play />
                  </IconButton>

                  <IconButton
                    aria-label={`Pause across ${selector.name} dimension`}
                    onClick={() => setPlaying(false)}
                    disabled={!playing}
                    sx={{ width: 14, height: 16 }}
                  >
                    <Pause />
                  </IconButton>
                </Flex>
              </Column>

              <Column start={[1, 2, 2, 2]} width={[4, 3, 3, 3]}>
                <Box sx={{ ...sx.subLabel, pb: 1 }}>
                  <DateDisplay
                    selector={selector}
                    chunkShape={chunk_shape[index]}
                  />{' '}
                  (
                  <Box as='span' sx={{ color: 'primary' }}>
                    {selector.index}
                  </Box>{' '}
                  / {chunk_shape[index] - 1})
                </Box>
              </Column>
            </Row>
            <Slider
              value={selector.index}
              min={0}
              max={chunk_shape[index] - 1}
              onChange={(e) => setSelectorIndex(parseFloat(e.target.value))}
              step={1}
              sx={{ mb: 3 }}
            />
          </>
        )}

        {finalChunk > 0 && (
          <Row columns={[4]}>
            <Column start={1} width={[4, 1, 1, 1]}>
              <Flex sx={{ gap: 3 }}>
                <IconButton
                  aria-label={`View previous ${selector.name} chunk`}
                  onClick={() => {
                    setSelector(index, { chunk: selector.chunk - 1 })
                  }}
                  disabled={selector.chunk === 0}
                  sx={{ width: 16, height: 16 }}
                >
                  <Back />
                </IconButton>

                <IconButton
                  aria-label={`View next ${selector.name} chunk`}
                  onClick={() => {
                    setSelector(index, { chunk: selector.chunk + 1 })
                  }}
                  disabled={selector.chunk === finalChunk}
                  sx={{ width: 16, height: 16 }}
                >
                  <Next />
                </IconButton>
              </Flex>
            </Column>

            <Column start={[1, 2, 2, 2]} width={[4, 3, 3, 3]}>
              <Box sx={sx.subLabel}>
                chunk{' '}
                <Box as='span' sx={{ color: 'primary' }}>
                  {selector.chunk}
                </Box>{' '}
                / {finalChunk}
              </Box>
            </Column>
          </Row>
        )}
      </Flex>
    </Label>
  )
}

export default Selector
