import { Select } from '@carbonplan/components'
import { Box } from 'theme-ui'
import { useDatasetStore } from './stores'

const DATASETS = [
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/air_temperature.zarr',
  'https://cmip6downscaling.blob.core.windows.net/vis/article/fig1/regions/central-america/gcm-tasmax.zarr',
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/sample_australia_cordex_data.zarr',
]

const Dataset = () => {
  const url = useDatasetStore((state) => state.url)
  const setUrl = useDatasetStore((state) => state.setUrl)

  return (
    <Box>
      <Select
        value={url ?? undefined}
        onChange={(e) => setUrl(e.target.value)}
        sx={{
          '& select': {
            width: '100%',
            overflow: 'hidden',
          },
        }}
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
    </Box>
  )
}

export default Dataset
