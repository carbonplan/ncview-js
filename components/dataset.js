import { Input, Select } from '@carbonplan/components'
import { Box, Flex } from 'theme-ui'
import { useCallback, useEffect, useState } from 'react'
import Label from './label'
import { TooltipContent, TooltipWrapper } from './tooltip'
import useStore from './store'
import VariableMetadata from './variable-metadata'

const DATASETS = [
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/air_temperature.zarr',
  'https://cmip6downscaling.blob.core.windows.net/vis/article/fig1/regions/central-america/gcm-tasmax.zarr',
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/sample_australia_cordex_data.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/gpcp_180_180_chunks.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/AGDC_rechunked_single_time_slice.zarr',
]

const API_METADATA = {
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/air_temperature.zarr':
    { air: { X: 'lon', Y: 'lat', T: null } },
  'https://cmip6downscaling.blob.core.windows.net/vis/article/fig1/regions/central-america/gcm-tasmax.zarr':
    { tasmax: { X: 'lon', Y: 'lat', T: null } },
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/sample_australia_cordex_data.zarr':
    { tas: { X: 'rlon', Y: 'rlat', T: null } },
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/gpcp_180_180_chunks.zarr':
    { precip: { X: 'longitude', Y: 'latitude', T: null } },
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/AGDC_rechunked_single_time_slice.zarr':
    { precip: { X: 'lon', Y: 'lat', T: null } },
}

const sx = {
  select: {
    '& select': {
      width: '100%',
      overflow: 'hidden',
    },
  },
}

const createDataset = async (url) => {
  const res = await fetch('https://ncview-backend.fly.dev/datasets/', {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, force: false }),
  })
  return res.json()
}

const pollForCompletedRun = async (
  id,
  setCompletedRun,
  interval = 1000,
  polls = 30
) => {
  const res = await fetch(`https://ncview-backend.fly.dev/datasets/${id}`, {
    method: 'GET',
    mode: 'cors',
  })
  const payload = await res.json()

  if (payload.rechunk_runs?.length > 0) {
    const run = payload.rechunk_runs[0]
    if (run.status === 'completed') {
      setCompletedRun(run)
      return
    }
  }

  if (polls > 1) {
    setTimeout(
      () => pollForCompletedRun(id, setCompletedRun, interval, polls - 1),
      interval
    )
  }
}

const Dataset = () => {
  const [expanded, setExpanded] = useState(false)
  const [url, setUrl] = useState('')
  const [dataset, setDataset] = useState(null)
  const [completedRun, setCompletedRun] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const setLoading = useStore((state) => state.setLoading)
  const setStoreUrl = useStore((state) => state.setUrl)
  const variable = useStore((state) => state.variable.name)
  const variables = useStore((state) => state.variables)

  const setVariable = useStore((state) => state.setVariable)

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setDataset(null)
      setCompletedRun(null)
      setErrorMessage(null)
      if (!url) {
        setErrorMessage('Please enter a URL')
        return
      }

      setLoading(true)
      const d = await createDataset(url)
      if (d.id) {
        setDataset(d)
        // todo: set interval + number of polls based on dataset size
        pollForCompletedRun(d.id, setCompletedRun)
        return
      }
      setLoading(false)

      if (d.detail?.length > 0) {
        setErrorMessage(d.detail[0].msg)
      } else {
        setErrorMessage('Unable to process dataset')
      }
    },
    [url]
  )

  useEffect(() => {
    if (dataset && completedRun) {
      if (completedRun.outcome === 'success') {
        setStoreUrl(completedRun.rechunked_dataset, dataset.cf_axes)
      } else if (completedRun.error_message) {
        setErrorMessage(completedRun.error_message)
      } else {
        setErrorMessage(
          completedRun.outcome === 'timed_out'
            ? 'Dataset processing timed out. Please try again with a smaller dataset.'
            : 'Dataset processing failed'
        )
      }
    }
    setLoading(false)
  }, [dataset, completedRun])

  return (
    <Flex sx={{ flexDirection: 'column', gap: 3 }}>
      <form onSubmit={handleSubmit}>
        <Label value='Dataset' htmlFor='dataset' direction='vertical'>
          <Input
            id='dataset'
            onChange={(e) => setUrl(e.target.value)}
            value={url}
            sx={{ width: '100%' }}
          />
          <Box
            sx={{
              fontSize: 1,
              mt: 2,
              color: 'secondary',
            }}
          >
            {errorMessage}
          </Box>
        </Label>
      </form>

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
