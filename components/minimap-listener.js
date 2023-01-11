import { useMinimap } from '@carbonplan/minimaps'
import { useEffect } from 'react'
import useStore from './store'

const MinimapListener = () => {
  const { projection, height, width } = useMinimap()
  const resetCenterChunk = useStore((state) => state.resetCenterChunk)
  const centerPoint = projection.invert([
    Math.round(height / 2),
    Math.round(width / 2),
  ])

  useEffect(() => {
    resetCenterChunk(centerPoint)
  }, centerPoint)
  return null
}

export default MinimapListener
