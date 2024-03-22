import { useState } from 'react'
import { Box } from 'theme-ui'

import useStore from '../data/store'
import Label from '../label'
import ArrayMetadata from '../array-metadata'
import { TooltipContent, TooltipWrapper } from '../tooltip'
import Slider from './slider'
import DateDisplay from '../date-display'

const SingleValue = ({ index }) => {
  const selector = useStore(
    (state) => state.selectors && state.selectors[index]
  )
  const selectorAxes = useStore((state) => state.dataset.selectorAxes)
  const chunk_shape = useStore(
    (state) => state.dataset.level.variable.chunk_shape[index]
  )

  if (selectorAxes.T?.index === index) {
    return (
      <DateDisplay
        array={selectorAxes.T.array}
        selector={selector}
        chunkShape={chunk_shape}
      />
    )
  } else if (selectorAxes.Z?.index === -1) {
    return selectorAxes.Z.array.data[0]
  } else {
    return (
      <>
        <Box as='span' sx={{ color: 'secondary' }}>
          index ={' '}
        </Box>
        {selector.index}
      </>
    )
  }
}

const Selector = ({ index }) => {
  const [expanded, setExpanded] = useState(false)
  const selector = useStore(
    (state) => state.selectors && state.selectors[index]
  )
  const shape = useStore((state) => state.dataset.level.variable.shape[index])

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

      {shape > 1 && <Slider index={index} />}
      {shape === 1 && <SingleValue index={index} />}
    </Label>
  )
}

export default Selector
