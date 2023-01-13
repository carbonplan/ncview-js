import { useMinimap } from '@carbonplan/minimaps'
import { useEffect } from 'react'

const MinimapListener = ({ setter }) => {
  const { projection, height, width } = useMinimap()

  useEffect(() => {
    if (projection) {
      setter({ projection, height, width })
    }
  }, [setter, projection, height, width])

  return null
}

export default MinimapListener
