import { Select, Slider } from '@carbonplan/components'
import { Box, Flex } from 'theme-ui'
import { useCallback, useState } from 'react'

import Label from './label'
import Selector from './selector'
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
