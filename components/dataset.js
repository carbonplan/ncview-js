import { Input } from '@carbonplan/components'
import { Box, Flex, IconButton } from 'theme-ui'
import { useCallback, useEffect, useState } from 'react'
import { Right, X } from '@carbonplan/icons'
import { useRouter } from 'next/router'

import Label from './label'
import useStore from './data/store'
import { inspectDataset } from './utils/data'

const DATASETS = [
  // NCVIEW 2.0
  // reprojection
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/ncview-2.0/single_timestep/sample_australia_cordex_data.zarr',

  // no pyramids
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/ncview-2.0/test_dataset1.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/ncview-2.0/test_dataset2.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/ncview-2.0/test_dataset3.zarr',

  // pyramids
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/ncview-2.0/dryspells_corn/CanESM5-ssp370-full-time-extent.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/ncview-2.0/ScenarioMIP.CCCma.CanESM5.ssp245.r1i1p1f1.annual.GARD-SV.tasmax.zarr',
  'https://carbonplan-data-viewer.s3.us-west-2.amazonaws.com/demo/ncview-2.0/ScenarioMIP.CCCma.CanESM5.ssp245.r1i1p1f1.annual.GARD-SV.pr.zarr',

  //s3 URL
  's3://carbonplan-data-viewer/demo/ncview-2.0/test_dataset2.zarr/',
  // blocked by CORS
  'gs://leap-persistent-ro/data-library-manual/CESM.zarr',
  // missing CF axes
  'https://cpdataeuwest.blob.core.windows.net/cp-cmip/version1/data/MACA/CMIP.NCC.NorESM2-LM.historical.r1i1p1f1.day.MACA.tasmax.zarr',
  // 4D pyramid
  'https://storage.googleapis.com/carbonplan-maps/v2/demo/4d/tavg-prec-month/',
  // 2D pyramid
  'https://storage.googleapis.com/carbonplan-maps/v2/demo/2d/tavg',
]

const sx = {
  icon: {
    height: [15, 15, 15, 20],
    width: [15, 15, 15, 20],
    mt: '5px',
    strokeWidth: '2px',
  },
}

const Dataset = () => {
  const [url, setUrl] = useState('')
  const [dataset, setDataset] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [focused, setFocused] = useState(false)
  const storeError = useStore((state) => state.error)
  const setStoreUrl = useStore((state) => state.setUrl)
  const router = useRouter()

  const submitUrl = useCallback(async (value, { clim } = {}) => {
    setDataset(null)
    setErrorMessage(null)

    if (!value) {
      setErrorMessage('Please enter a URL')
      return
    }

    // Clear store URL
    setStoreUrl()

    try {
      const { url, cf_axes, pyramid } = await inspectDataset(value)
      if (pyramid) {
        // Use pyramid when present
        setStoreUrl(url, { cfAxes: cf_axes, pyramid: true, clim })
      } else {
        // Otherwise construct Zarr proxy URL
        const u = new URL(url)
        setStoreUrl(
          'https://ok6vedl4oj7ygb4sb2nzqvvevm0qhbbc.lambda-url.us-west-2.on.aws/' +
            u.hostname +
            u.pathname,
          { cfAxes: cf_axes, pyramid: false, clim }
        )
      }
    } catch (e) {
      setErrorMessage(e.message ?? 'Unable to process dataset')
    }
  }, [])

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault()
      submitUrl(url)
    },
    [url]
  )

  useEffect(() => {
    if (!url && router.query?.dataset) {
      setUrl(router.query.dataset)
      const clim = (router.query.clim ?? '').split(',').map(Number)

      submitUrl(router.query.dataset, {
        clim: clim && clim.length === 2 ? clim : null,
      })
    }
  }, [!url, router.query?.dataset])

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
              transition: 'color 0.15s',
              pr: 0,
              mr: '-6px',
              '@media (hover: hover) and (pointer: fine)': {
                '&:hover': {
                  color: 'primary',
                },
              },
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
