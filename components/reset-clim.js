import { useCallback } from 'react'

import useStore from './store'
import { Button } from '@carbonplan/components'
import { Reset } from '@carbonplan/icons'
import { Flex } from 'theme-ui'

const ResetClim = () => {
  const loading = useStore((state) => state.loading)
  const setClim = useStore((state) => state.setClim)
  const activeChunkKeys = useStore((state) => state.activeChunkKeys)
  const chunks = useStore((state) => state.chunks)

  const resetClim = useCallback(() => {
    let clim
    clim = activeChunkKeys.reduce(
      (accum, key) => {
        if (chunks[key]) {
          accum[0] = Math.min(accum[0], chunks[key].clim[0])
          accum[1] = Math.max(accum[1], chunks[key].clim[1])
        }
        return accum
      },
      [Infinity, -Infinity]
    )
    if (clim.some((d) => d === Infinity || d === -Infinity)) {
      clim = [0, 0]
    }
    setClim(clim)
  }, [activeChunkKeys, chunks])

  return (
    <Flex sx={{ width: '100%', justifyContent: 'flex-end' }}>
      <Button
        suffix={<Reset />}
        inverted
        onClick={resetClim}
        size='xs'
        disabled={loading}
      >
        Reset color range
      </Button>
    </Flex>
  )
}

export default ResetClim
