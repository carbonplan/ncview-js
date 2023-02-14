import { Input } from '@carbonplan/components'
import { Box, Flex, IconButton } from 'theme-ui'
import { useCallback, useState } from 'react'
import { Right, X } from '@carbonplan/icons'

import Label from './label'
import useStore from './store'

const DATASETS = [
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/air_temperature.zarr',
  'https://cmip6downscaling.blob.core.windows.net/vis/article/fig1/regions/central-america/gcm-tasmax.zarr',
  'https://storage.googleapis.com/carbonplan-maps/ncview/demo/single_timestep/sample_australia_cordex_data.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/gpcp_180_180_chunks.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/AGDC_rechunked_single_time_slice.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/cmip6_2d_2015.zarr',
  's3://carbonplan-data-viewer/demo/MURSST.zarr',
  's3://carbonplan-data-viewer/demo/hadisst_2d.zarr',
  's3://mur-sst/zarr',
  'https://ncsa.osn.xsede.org/Pangeo/pangeo-forge/WOA_1degree_monthly-feedstock/woa18-1deg-monthly.zarr',
]

const sx = {
  icon: {
    height: [15, 15, 15, 20],
    width: [15, 15, 15, 20],
    mt: '5px',
    strokeWidth: '2px',
  },
}

const createDataset = async (url, force) => {
  const res = await fetch('https://ncview-backend.fly.dev/datasets/', {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, force }),
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
  } else {
    setCompletedRun({
      error_message:
        'Dataset processing still in-progress. Try submitting the dataset again to continue receiving updates, or come back later.',
    })
  }
}

const CLIMS = {
  46: [-5000, 10000], // s3://carbonplan-data-viewer/demo/MURSST.zarr
  45: [-2, 30], // s3://carbonplan-data-viewer/demo/hadisst_2d.zarr
}

const Dataset = () => {
  const [url, setUrl] = useState('')
  const [dataset, setDataset] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [focused, setFocused] = useState(false)
  const storeError = useStore((state) => state.error)
  const setStoreUrl = useStore((state) => state.setUrl)

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setDataset(null)
      setErrorMessage(null)
      if (!url) {
        setErrorMessage('Please enter a URL')
        return
      }

      setStoreUrl()
      const d = await createDataset(url)
      if (d.id) {
        setDataset(d)
        const u = new URL(d.url)
        setStoreUrl(
          'https://ok6vedl4oj7ygb4sb2nzqvvevm0qhbbc.lambda-url.us-west-2.on.aws/' +
            u.hostname +
            u.pathname,
          d.cf_axes,
          CLIMS[d.id]
        )
      } else if (d.detail?.length > 0) {
        setErrorMessage(d.detail[0].msg)
      } else {
        setErrorMessage('Unable to process dataset')
      }
    },
    [url]
  )

  return (
    <form onSubmit={handleSubmit}>
      <Label
        value='Dataset'
        htmlFor='dataset'
        direction='vertical'
        sx={{
          color: 'primary',
          fontSize: 2,
          fontFamily: 'heading',
        }}
      >
        <Flex
          sx={{
            gap: 2,
            position: 'relative',
            borderColor: focused ? 'primary' : 'secondary',
            borderStyle: 'solid',
            borderWidth: '0px',
            borderBottomWidth: '1px',
            transition: 'border 0.15s',
          }}
        >
          <Input
            id='dataset'
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            value={url}
            sx={{ width: '100%', borderBottomWidth: 0 }}
            size='xs'
          />
          <IconButton
            sx={{
              cursor: 'pointer',
              fill: 'none',
              strokeWidth: '2px',
              stroke: 'text',
              color: 'secondary',
            }}
            aria-label={dataset ? 'Clear URL' : 'Submit URL'}
            type={dataset ? 'button' : 'submit'}
            onClick={(e) => {
              if (dataset) {
                e.preventDefault()
                setUrl('')
                setDataset(null)
                setErrorMessage(null)
                setStoreUrl(null)
              }
            }}
          >
            {dataset ? <X sx={sx.icon} /> : <Right sx={sx.icon} />}
          </IconButton>
        </Flex>
        <Box
          sx={{
            fontSize: 1,
            my: 2,
            color: 'red',
          }}
        >
          {storeError ?? errorMessage}
        </Box>
      </Label>
    </form>
  )
}

export default Dataset
