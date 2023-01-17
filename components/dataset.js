import { Input, Select } from '@carbonplan/components'
import { Box, Checkbox, Flex, IconButton } from 'theme-ui'
import { useCallback, useEffect, useState } from 'react'
import { Right, X } from '@carbonplan/icons'

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
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/cmip6_2d_2015.zarr',
  's3://carbonplan-data-viewer/demo/MURSST.zarr',
  's3://carbonplan-data-viewer/demo/hadisst_2d.zarr',
]

const sx = {
  select: {
    '& select': {
      width: '100%',
      overflow: 'hidden',
    },
  },
  icon: {
    height: [15, 15, 15, 20],
    width: [15, 15, 15, 20],
    mt: '5px',
    strokeWidth: '2px',
  },
  checkbox: (checked) => ({
    height: 20,
    width: 20,
    cursor: 'pointer',
    color: 'muted',
    transition: 'color 0.15s',
    'input:active ~ &': { bg: 'background', color: 'primary' },
    'input:focus ~ &': {
      bg: 'background',
      color: checked ? 'primary' : 'muted',
    },
    'input:hover ~ &': { bg: 'background', color: 'primary' },
    'input:focus-visible ~ &': {
      outline: 'dashed 1px rgb(110, 110, 110, 0.625)',
      background: 'rgb(110, 110, 110, 0.625)',
    },
  }),
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
  21: [-5000, 10000], // s3://carbonplan-data-viewer/demo/MURSST.zarr
  25: [-2, 30], // s3://carbonplan-data-viewer/demo/hadisst_2d.zarr
}

const Dataset = () => {
  const [expanded, setExpanded] = useState(false)
  const [url, setUrl] = useState('')
  const [dataset, setDataset] = useState(null)
  const [completedRun, setCompletedRun] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [focused, setFocused] = useState(false)
  const [forceRerun, setForceRerun] = useState(false)
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

      setStoreUrl()
      setLoading(true)
      const d = await createDataset(url, forceRerun)
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
    [url, forceRerun]
  )

  useEffect(() => {
    if (dataset && completedRun) {
      if (completedRun.outcome === 'success') {
        setStoreUrl(
          completedRun.rechunked_dataset,
          dataset.cf_axes,
          CLIMS[dataset.id]
        ).then((error) => {
          if (error) {
            setErrorMessage(error)
            setLoading(false)
            setStoreUrl(null)
          }
        })
      } else if (completedRun.error_message) {
        setErrorMessage(completedRun.error_message)
      } else {
        setErrorMessage(
          completedRun.outcome === 'timed_out'
            ? 'Dataset processing timed out. Please try again with a smaller dataset.'
            : 'Dataset processing failed'
        )
      }
      setLoading(false)
    }
  }, [dataset, completedRun])

  return (
    <Flex sx={{ flexDirection: 'column', gap: 3 }}>
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
                  setCompletedRun(null)
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
            {errorMessage}
          </Box>
        </Label>

        <Box
          as='label'
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'secondary',
            fontFamily: 'mono',
            letterSpacing: 'mono',
            textTransform: 'uppercase',
            fontSize: 1,
            width: 'fit-content',
          }}
        >
          <Checkbox
            sx={sx.checkbox(forceRerun)}
            checked={forceRerun}
            onChange={() => setForceRerun(!forceRerun)}
          />
          <Box sx={{ ml: '-3px' }}>Force rerun</Box>
        </Box>
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
                size='xs'
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
