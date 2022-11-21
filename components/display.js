import { Box, Flex } from 'theme-ui'
import { Toggle, Select, Colorbar } from '@carbonplan/components'
import { colormaps, useThemedColormap } from '@carbonplan/colormaps'
import { format } from 'd3-format'

import { useDatasetStore, useDisplayStore } from './stores'
import Label from './label'

const Display = () => {
  const url = useDatasetStore((state) => state.url)
  const loading = !url
  const basemaps = useDisplayStore((state) => state.basemaps)
  const setBasemaps = useDisplayStore((state) => state.setBasemaps)
  const projection = useDisplayStore((state) => state.projection)
  const setProjection = useDisplayStore((state) => state.setProjection)
  const clim = useDisplayStore((state) => state.clim)
  const setClim = useDisplayStore((state) => state.setClim)
  const setColormap = useDisplayStore((state) => state.setColormap)
  const colormapName = useDisplayStore((state) => state.colormap)
  const colormap = useThemedColormap(loading ? 'greys' : colormapName, {
    count: 255,
    format: 'rgb',
  })

  return (
    <Flex sx={{ flexDirection: 'column', gap: 3 }}>
      <Label value='Projection' htmlFor='projection'>
        <Select
          onChange={(e) => setProjection(e.target.value)}
          value={projection}
          disabled={loading}
          id='projection'
        >
          <option value='naturalEarth1'>naturalEarth1</option>
          <option value='orthographic'>orthographic</option>
          <option value='mercator'>mercator</option>
          <option value='equirectangular'>equirectangular</option>
        </Select>
      </Label>

      <Box>
        <Label value='Basemaps' htmlFor='land'>
          <Flex sx={{ gap: 2 }}>
            Land
            <Toggle
              id='land'
              value={basemaps.land}
              onClick={() => setBasemaps({ land: !basemaps.land })}
            />
          </Flex>
        </Label>

        <Label>
          <Flex sx={{ gap: 2 }}>
            Ocean
            <Toggle
              value={basemaps.ocean}
              onClick={() => setBasemaps({ ocean: !basemaps.ocean })}
            />
          </Flex>
        </Label>
      </Box>

      <Label value='Colormap' htmlFor='colormap'>
        <Select
          onChange={(e) => setColormap(e.target.value)}
          value={colormapName}
          disabled={loading}
          id='colormap'
        >
          {colormaps.map(({ name }) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </Label>

      <Colorbar
        colormap={colormap}
        clim={clim}
        setClim={clim ? (setter) => setClim(setter(clim)) : null}
        format={format('.1f')}
        width='100%'
        horizontal
        bottom
      />
    </Flex>
  )
}

export default Display
