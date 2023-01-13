import { useMinimap } from '@carbonplan/minimaps'
import { useEffect } from 'react'
import useStore from './store'

const MinimapListener = ({ setter }) => {
  const { projection, height, width } = useMinimap()
  const resetCenterChunk = useStore((state) => state.resetCenterChunk)
  const centerPoint = projection.invert([
    Math.round(height / 2),
    Math.round(width / 2),
  ])

  useEffect(() => {
    resetCenterChunk(centerPoint)
  }, centerPoint)

  useEffect(() => {
    if (projection) {
      setter({ projection, height, width })
    }
  }, [setter, projection, height, width])

  return null
}

export default MinimapListener
