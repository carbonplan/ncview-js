import { Column, Row, Slider as SliderComponent } from '@carbonplan/components'
import { Box, Flex } from 'theme-ui'
import { useCallback, useEffect, useState } from 'react'

import useStore from '../data/store'
import { IconButton, Next, Back, Play, Pause } from '../icons'
import DateDisplay from '../date-display'
import usePlay from './use-play'

const sx = {
  subLabel: {
    fontFamily: 'mono',
    letterSpacing: 'mono',
    color: 'secondary',
    fontSize: 1,
  },
}

const Slider = ({ index, skipArrayLabels = false }) => {
  const [playing, setPlaying] = usePlay(index, { incrementChunk: true })
  const selector = useStore(
    (state) => state.selectors && state.selectors[index]
  )
  const setSelector = useStore((state) => state.setSelector)
  const setScrubbing = useStore((state) => state.setScrubbing)
  const [sliderValue, setSliderValue] = useState(selector)
  const [sliding, setSliding] = useState(false)
  const chunk_shape = useStore(
    (state) => state.dataset.level.variable.chunk_shape[index]
  )
  const shape = useStore((state) => state.dataset.level.variable.shape[index])
  const numChunks = Math.ceil(shape / chunk_shape)

  const handleChange = useCallback(
    (e) => {
      const value = parseFloat(e.target.value)
      const updatedSelector = {
        index: value % chunk_shape,
        chunk: Math.floor(value / chunk_shape),
      }

      setSliderValue(updatedSelector)
      if (!sliding) {
        setSelector(index, updatedSelector)
      }
    },
    [index, sliding, chunk_shape]
  )

  useEffect(() => {
    if (
      selector.index !== sliderValue.index ||
      selector.chunk !== sliderValue.chunk
    ) {
      setSliderValue(selector)
    }
  }, [selector.index, selector.chunk])

  const handleMouseDown = useCallback(() => {
    setSliding(true)
    setScrubbing(true)
    setSelector(index, sliderValue)
  }, [index, sliderValue])

  const handleMouseUp = useCallback(() => {
    setSliding(false)
    setScrubbing(false)
    setSelector(index, sliderValue)
  }, [index, sliderValue])

  let value
  if (skipArrayLabels) {
    value = `Index=${sliderValue.chunk * chunk_shape + sliderValue.index}`
  } else if (selector.metadata.cfAxis === 'T') {
    value = (
      <DateDisplay
        array={selector.metadata.array}
        selector={{ ...selector, ...sliderValue }}
        chunkShape={chunk_shape}
      />
    )
  } else {
    value =
      selector.metadata.array.data[
        sliderValue.chunk * chunk_shape + sliderValue.index
      ]
  }

  return (
    <Flex sx={{ flexDirection: 'column', gap: 1, mt: 3 }}>
      <Row columns={[4]}>
        <Column start={1} width={[4, 2, 2, 2]} sx={{ mb: 3 }}>
          <Flex sx={{ gap: 4 }}>
            {numChunks > 1 && (
              <IconButton
                aria-label={`View previous ${selector.name} chunk`}
                onClick={() => {
                  setSelector(index, { chunk: selector.chunk - 1 })
                }}
                disabled={selector.chunk === 0}
                sx={{ width: 16, height: 16 }}
              >
                <Back sx={{ flexShrink: 0 }} />
              </IconButton>
            )}

            <IconButton
              aria-label={`Play across ${selector.name} dimension`}
              onClick={() => setPlaying(true)}
              disabled={playing}
              sx={{ width: 14, height: 16 }}
            >
              <Play sx={{ flexShrink: 0 }} />
            </IconButton>

            <IconButton
              aria-label={`Pause across ${selector.name} dimension`}
              onClick={() => setPlaying(false)}
              disabled={!playing}
              sx={{ width: 14, height: 16 }}
            >
              <Pause sx={{ flexShrink: 0 }} />
            </IconButton>

            {numChunks > 1 && (
              <IconButton
                aria-label={`View next ${selector.name} chunk`}
                onClick={() => {
                  setSelector(index, { chunk: selector.chunk + 1 })
                }}
                disabled={selector.chunk === numChunks - 1}
                sx={{ width: 16, height: 16 }}
              >
                <Next sx={{ flexShrink: 0 }} />
              </IconButton>
            )}
          </Flex>
        </Column>
      </Row>

      <SliderComponent
        value={sliderValue.chunk * chunk_shape + sliderValue.index}
        min={0}
        max={shape - 1}
        onChange={handleChange}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        step={1}
        sx={{ mb: 3 }}
      />

      <Box sx={{ ...sx.subLabel, pb: 1 }}>
        <Flex sx={{ gap: 2 }}>
          {value}
          <Box>
            (
            <Box as='span' sx={{ color: 'primary' }}>
              {sliderValue.chunk * chunk_shape + sliderValue.index}
            </Box>
          </Box>
          /<Box>{shape - 1})</Box>
        </Flex>
      </Box>
    </Flex>
  )
}

export default Slider
