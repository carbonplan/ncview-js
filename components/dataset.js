import { Select } from '@carbonplan/components'
import { Box, Flex } from 'theme-ui'
import Label from './label'
import useStore from './store'

const DATASETS = [
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/air_temperature.zarr',
  'https://cmip6downscaling.blob.core.windows.net/vis/article/fig1/regions/central-america/gcm-tasmax.zarr',
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/sample_australia_cordex_data.zarr',
]

const sx = {
  select: {
    '& select': {
      width: '100%',
      overflow: 'hidden',
    },
  },
}
const Dataset = () => {
  const url = useStore((state) => state.url)
  const setUrl = useStore((state) => state.setUrl)

  const variable = useStore((state) => state.variable)
  const variables = useStore((state) => state.variables)

  const metadata = useStore((state) => state.metadata)
  const setVariable = useStore((state) => state.setVariable)

  return (
    <Flex sx={{ flexDirection: 'column', gap: 3 }}>
      <Label value='Dataset' htmlFor='dataset' direction='vertical'>
        <Select
          value={url ?? undefined}
          onChange={(e) => setUrl(e.target.value)}
          id='dataset'
          sx={sx.select}
        >
          <option disabled selected value>
            select an option
          </option>

          {DATASETS.map((d, i) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </Label>

      <Label value='Variable' htmlFor='variable'>
        <Select
          value={variable}
          onChange={(e) => setVariable(e.target.value)}
          id='variable'
          sx={sx.select}
        >
          {variables.map((d, i) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </Label>
    </Flex>
  )
}

export default Dataset
