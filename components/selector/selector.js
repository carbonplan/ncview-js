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
  const { array, cfAxis } = selector.metadata
  const chunk_shape = useStore(
    (state) => state.dataset.level.variable.chunk_shape[index]
  )

  if (cfAxis === 'T') {
    return (
      <DateDisplay array={array} selector={selector} chunkShape={chunk_shape} />
    )
  } else if (array) {
    return array.data[0]
  } else {
    console.warn(
      `No array found for ${selector?.name} dimension (index=${index})`
    )
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
