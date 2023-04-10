import { useState } from 'react'

import useStore from '../store'
import Label from '../label'
import ArrayMetadata from '../array-metadata'
import { TooltipContent, TooltipWrapper } from '../tooltip'
import Chunks from './chunks'
import Slider from './slider'

const Selector = ({ index, display = 'slider' }) => {
  const [expanded, setExpanded] = useState(false)
  const selector = useStore(
    (state) =>
      state.dataset.variable.selectors &&
      state.dataset.variable.selectors[index]
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

      {display === 'chunks' && <Chunks index={index} />}
      {display === 'slider' && <Slider index={index} />}
    </Label>
  )
}

export default Selector
