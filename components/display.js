import { Box, Flex } from 'theme-ui'
import { Toggle, Select, Colorbar } from '@carbonplan/components'
import { colormaps, useThemedColormap } from '@carbonplan/colormaps'
import { format } from 'd3-format'

import { useDisplayStore } from './stores'

const Display = () => {
  const basemaps = useDisplayStore((state) => state.basemaps)
  const setBasemaps = useDisplayStore((state) => state.setBasemaps)
  const projection = useDisplayStore((state) => state.projection)
  const setProjection = useDisplayStore((state) => state.setProjection)
  const clim = useDisplayStore((state) => state.clim)
  const setClim = useDisplayStore((state) => state.setClim)
  const setColormap = useDisplayStore((state) => state.setColormap)
  const colormapName = useDisplayStore((state) => state.colormap)
  const colormap = useThemedColormap(colormapName, {
    count: 255,
    format: 'rgb',
  })

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

      <Select
        onChange={(e) => setColormap(e.target.value)}
        value={colormapName}
      >
        {colormaps.map(({ name }) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>

      <Colorbar
        colormap={colormap}
        clim={clim}
        setClim={clim ? (setter) => setClim(setter(clim)) : null}
        format={format('.1f')}
        horizontal
      />
    </Box>
  )
}

export default Display
