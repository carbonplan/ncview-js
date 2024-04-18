import { Box, Flex } from 'theme-ui'
import { Toggle, Select, Colorbar } from '@carbonplan/components'
import { colormaps, useThemedColormap } from '@carbonplan/colormaps'
import { format } from 'd3-format'

import useStore from './data/store'
import Label from './label'
import ResetClim from './reset-clim'

const Display = () => {
  const hasData = useStore((state) => !!state.dataset)
  const loading = useStore((state) => state.getLoading())
  const basemaps = useStore((state) => state.basemaps)
  const setBasemaps = useStore((state) => state.setBasemaps)
  const projection = useStore((state) => state.projection)
  const setProjection = useStore((state) => state.setProjection)
  const clim = useStore((state) => state.clim)
  const setClim = useStore((state) => state.setClim)
  const setColormap = useStore((state) => state.setColormap)
  const colormapName = useStore((state) => state.colormap)
  const variable = useStore((state) => state.dataset?.variable)
  const pyramid = useStore((state) => state.dataset?.pyramid)
  const { units } = useStore((state) =>
    variable ? state.dataset?.getZattrs(variable) : {}
  )
  const colormap = useThemedColormap(!hasData ? 'greys' : colormapName, {
    count: 255,
    format: 'rgb',
  })

  return (
    <Flex sx={{ flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          fontSize: 2,
          fontFamily: 'heading',
          textTransform: 'uppercase',
          letterSpacing: 'mono',
        }}
      >
        Display
      </Box>
      <Label value='Projection' htmlFor='projection'>
        <Select
          onChange={(e) => setProjection(e.target.value)}
          value={projection}
          disabled={loading || pyramid}
          id='projection'
          size='xs'
          sx={{
            '& select:disabled': {
              color: 'secondary',
              borderBottomColor: 'muted',
              cursor: 'initial',
            },
          }}
        >
          <option value='naturalEarth1'>naturalEarth1</option>
          <option value='orthographic'>orthographic</option>
          <option value='mercator'>mercator</option>
          <option value='equirectangular'>equirectangular</option>
        </Select>
      </Label>
      <Box>
        <Label value='Basemaps' htmlFor='landBoundaries'>
          <Flex sx={{ gap: 2, fontSize: [2, 2, 2, 3] }}>
            Land boundaries
            <Toggle
              id='landBoundaries'
              value={basemaps.landBoundaries}
              onClick={() =>
                setBasemaps({ landBoundaries: !basemaps.landBoundaries })
              }
              sx={{ mt: '2px' }}
            />
          </Flex>
        </Label>

        <Label>
          <Flex sx={{ gap: 2, fontSize: [2, 2, 2, 3] }}>
            Land mask
            <Toggle
              value={basemaps.landMask}
              onClick={() => setBasemaps({ landMask: !basemaps.landMask })}
              sx={{ mt: '2px' }}
            />
          </Flex>
        </Label>

        <Label>
          <Flex sx={{ gap: 2, fontSize: [2, 2, 2, 3] }}>
            Ocean mask
            <Toggle
              value={basemaps.oceanMask}
              onClick={() => setBasemaps({ oceanMask: !basemaps.oceanMask })}
              sx={{ mt: '2px' }}
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
          size='xs'
        >
          {colormaps.map(({ name }) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </Label>
      <Label
        value={variable && units ? `${variable} (${units})` : ''}
        htmlFor='colorRange'
        direction='vertical'
      >
        <Colorbar
          id='colorRange'
          colormap={colormap}
          clim={clim}
          setClim={clim ? (setter) => setClim(setter(clim)) : null}
          format={format('.1f')}
          width='100%'
          horizontal
          sxClim={{ fontSize: [1, 1, 1, 2], mt: ['-1px'], pb: ['2px'] }}
        />
      </Label>
      <ResetClim />
    </Flex>
  )
}

export default Display
