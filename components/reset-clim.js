import { useCallback } from 'react'

import useStore from './data/store'
import { Button } from '@carbonplan/components'
import { Reset } from '@carbonplan/icons'
import { Flex } from 'theme-ui'

const ResetClim = () => {
  const loading = useStore((state) => state.getLoading())
  const setClim = useStore((state) => state.setClim)
  const chunksToRender = useStore((state) => state.chunksToRender)
  const chunks = useStore((state) => state.dataset?.chunks || {})

  const resetClim = useCallback(() => {
    let clim
    clim = chunksToRender.reduce(
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
  }, [chunksToRender, chunks])

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
