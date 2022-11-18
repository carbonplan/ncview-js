import { Box, Flex } from 'theme-ui'
import { Toggle, Select } from '@carbonplan/components'

import { useDisplayStore } from './stores'

const Display = () => {
  const basemaps = useDisplayStore((state) => state.basemaps)
  const setBasemaps = useDisplayStore((state) => state.setBasemaps)
  const projection = useDisplayStore((state) => state.projection)
  const setProjection = useDisplayStore((state) => state.setProjection)

  return (
    <Box>
      <Select
        onChange={(e) => setProjection(e.target.value)}
        value={projection}
      >
        <option value='naturalEarth1'>naturalEarth1</option>
        <option value='orthographic'>orthographic</option>
        <option value='mercator'>mercator</option>
        <option value='equirectangular'>equirectangular</option>
      </Select>

      <Flex sx={{ gap: 2 }}>
        Land
        <Toggle
          value={basemaps.land}
          onClick={() => setBasemaps({ land: !basemaps.land })}
        />
      </Flex>

      <Flex sx={{ gap: 2 }}>
        Ocean
        <Toggle
          value={basemaps.ocean}
          onClick={() => setBasemaps({ ocean: !basemaps.ocean })}
        />
      </Flex>
    </Box>
  )
}

export default Display
