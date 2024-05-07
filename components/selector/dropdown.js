import { Select } from '@carbonplan/components'
import { Box, Flex } from 'theme-ui'
import { useCallback } from 'react'

import useStore from '../data/store'

const sx = {
  subLabel: {
    fontFamily: 'mono',
    letterSpacing: 'mono',
    color: 'secondary',
    fontSize: 1,
  },
}

const Dropdown = ({ index }) => {
  const selector = useStore(
    (state) => state.selectors && state.selectors[index]
  )
  const setSelector = useStore((state) => state.setSelector)
  const chunk_shape = useStore(
    (state) => state.dataset.level.variable.chunk_shape[index]
  )
  const shape = useStore((state) => state.dataset.level.variable.shape[index])

  const handleChange = useCallback(
    (e) => {
      const value = parseFloat(e.target.value)
      const updatedSelector = {
        index: value % chunk_shape,
        chunk: Math.floor(value / chunk_shape),
      }

      setSelector(index, updatedSelector)
    },
    [index, chunk_shape]
  )

  return (
    <Flex sx={{ flexDirection: 'column', gap: 3, mt: 3 }}>
      <Select
        onChange={handleChange}
        value={selector.chunk * chunk_shape + selector.index}
      >
        {selector.metadata.array.data.map((value, i) => (
          <option key={value} value={i}>
            {value ?? i}
          </option>
        ))}
      </Select>
      <Box sx={{ ...sx.subLabel, pb: 1 }}>
        <Flex sx={{ gap: 2 }}>
          <Box>
            (
            <Box as='span' sx={{ color: 'primary' }}>
              {selector.chunk * chunk_shape + selector.index}
            </Box>
          </Box>
          /<Box>{shape - 1})</Box>
        </Flex>
      </Box>
    </Flex>
  )
}

export default Dropdown
