import { Select, Slider } from '@carbonplan/components'
import { Box, Flex } from 'theme-ui'
import { useCallback, useState } from 'react'

import Label from './label'
import { TooltipContent, TooltipWrapper } from './tooltip'
import useStore from './store'
import VariableMetadata from './variable-metadata'

const sx = {
  select: {
    '& select': {
      width: '100%',
      overflow: 'hidden',
    },
  },
  icon: {
    height: [15, 15, 15, 20],
    width: [15, 15, 15, 20],
    mt: '5px',
    strokeWidth: '2px',
  },
  subLabel: {
    fontFamily: 'mono',
    letterSpacing: 'mono',
    color: 'secondary',
    fontSize: 1,
  },
}

const Selector = ({ index }) => {
  const selector = useStore(
    (state) => state.variable.selectors && state.variable.selectors[index]
  )
  const setSelector = useStore((state) => state.setSelector)
  const chunk_shape = useStore((state) => state.variable.chunk_shape)
  const numChunks = useStore((state) =>
    Math.ceil(state.variable.shape[index] / state.variable.chunk_shape[index])
  )

  const setSelectorIndex = useCallback(
    (value) => {
      setSelector(index, { index: value })
    },
    [index]
  )

  const setSelectorChunk = useCallback(
    (value) => {
      setSelector(index, { chunk: value })
    },
    [index]
  )

  return (
    <Label value={selector.name} direction='vertical'>
      <Flex sx={{ flexDirection: 'column', gap: 3 }}>
        <Box>
          <Box sx={{ ...sx.subLabel, pb: 1 }}>
            step{' '}
            <Box as='span' sx={{ color: 'primary' }}>
              {selector.index}
            </Box>{' '}
            / {chunk_shape[index]}
          </Box>

          <Slider
            value={selector.index}
            min={0}
            max={chunk_shape[index]}
            onChange={(e) => setSelectorIndex(parseFloat(e.target.value))}
            step={1}
          />
        </Box>
        <Box sx={sx.subLabel}>
          chunk{' '}
          <Box as='span' sx={{ color: 'primary' }}>
            {selector.chunk}
          </Box>{' '}
          / {numChunks}
        </Box>
      </Flex>
    </Label>
  )
}

const Selectors = () => {
  const [expanded, setExpanded] = useState(false)
  const variable = useStore((state) => state.variable.name)
  const variables = useStore((state) => state.variables)
  const selectors = useStore((state) => state.variable.selectors || [])

  const setVariable = useStore((state) => state.setVariable)

  return (
    <>
      {variable && (
        <>
          <Label value='Variable' htmlFor='variable'>
            <TooltipWrapper expanded={expanded} setExpanded={setExpanded}>
              <Select
                value={variable}
                onChange={(e) => setVariable(e.target.value)}
                id='variable'
                sx={sx.select}
                size='xs'
              >
                {variables.map((d, i) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </TooltipWrapper>
          </Label>
          <TooltipContent expanded={expanded}>
            <VariableMetadata />
          </TooltipContent>
        </>
      )}

      {selectors
        .filter((s) => typeof s.chunk === 'number')
        .map((s, i) => (
          <Selector key={s.name} index={i} />
        ))}
    </>
  )
}

export default Selectors
