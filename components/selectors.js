import { Select } from '@carbonplan/components'
import { useState } from 'react'

import Label from './label'
import Selector from './selector'
import { TooltipContent, TooltipWrapper } from './tooltip'
import useStore from './data/store'
import ArrayMetadata from './array-metadata'

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
  const variable = useStore((state) => state.dataset?.variable)
  const variables = useStore((state) => state.dataset?.variables)
  const selectors = useStore((state) => state.selectors)

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
            <ArrayMetadata array={variable} />
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
