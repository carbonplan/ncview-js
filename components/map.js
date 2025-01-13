import { Box, Flex } from 'theme-ui'
import { alpha } from '@theme-ui/color'

import useStore from './data/store'
import ProxyMap from './proxy-map'
import PyramidMap from './pyramid-map'

const Map = () => {
  const dataset = useStore((state) => state.dataset)
  const loading = useStore((state) => state.getLoading())

  return (
    <Flex
      sx={{
        height: '100vh',
        mr: [-4, -5, -5, -6],
        flexDirection: 'column',
        justifyContent: 'center',
        background: alpha('secondary', 0.2),
      }}
    >
      {dataset && !dataset.pyramid && <ProxyMap />}
      {dataset && dataset.pyramid && <PyramidMap />}

      {!dataset && (
        <Box
          sx={{
            width: '100%',
            textAlign: 'center',
            fontFamily: 'mono',
            letterSpacing: 'mono',
            color: 'secondary',
          }}
        >
          {loading
            ? 'Loading Zarr store...'
            : 'Provide a Zarr link to explore data'}
        </Box>
      )}
    </Flex>
  )
}

export default Map
