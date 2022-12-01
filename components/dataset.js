import { Select } from '@carbonplan/components'
import { Flex } from 'theme-ui'
import Label from './label'
import { TooltipContent, TooltipWrapper } from './tooltip'
import useStore from './store'
import VariableMetadata from './variable-metadata'
import { useState } from 'react'

const DATASETS = [
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/air_temperature.zarr',
  'https://cmip6downscaling.blob.core.windows.net/vis/article/fig1/regions/central-america/gcm-tasmax.zarr',
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/sample_australia_cordex_data.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/gpcp_180_180_chunks.zarr',
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
  const [expanded, setExpanded] = useState(false)
  const url = useStore((state) => state.url)
  const setUrl = useStore((state) => state.setUrl)

  const variable = useStore((state) => state.variable.name)
  const variables = useStore((state) => state.variables)

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

      {variable && (
        <>
          <Label value='Variable' htmlFor='variable'>
            <TooltipWrapper expanded={expanded} setExpanded={setExpanded}>
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
            </TooltipWrapper>
          </Label>
          <TooltipContent expanded={expanded}>
            <VariableMetadata />
          </TooltipContent>
        </>
      )}
    </Flex>
  )
}

export default Dataset
