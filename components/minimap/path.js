import React, { useEffect, useState } from 'react'
import { geoPath } from 'd3-geo'
import { feature as topoFeature } from 'topojson-client'
import { useMinimap } from './minimap'
import useTransform from './use-transform'

const Path = ({
  source,
  feature,
  fill = 'none',
  stroke = 'none',
  strokeWidth = 0.5,
  opacity = 0.7,
}) => {
  const [path, setPath] = useState()
  const [sphere, setSphere] = useState()
  const [data, setData] = useState()
  const { projection } = useMinimap()
  const { ref, transform } = useTransform()

  useEffect(() => {
    fetch(source)
      .then((response) => response.json())
      .then((topology) => {
        setData(topoFeature(topology, topology.objects[feature]))
      })
  }, [source])

  useEffect(() => {
    setPath(geoPath(projection)(data))
  }, [data, projection])
  useEffect(() => {
    setSphere(geoPath(projection)({ type: 'Sphere' }))
  }, [data, projection])

  return (
    path &&
    sphere && (
      <>
        <path
          d={path}
          stroke={transform ? stroke : 'none'}
          fill={transform ? fill : 'none'}
          opacity={opacity}
          strokeWidth={strokeWidth}
          transform={transform}
          style={{
            vectorEffect: 'non-scaling-stroke',
          }}
        />
        <path fill='none' d={sphere} ref={ref} />
      </>
    )
  )
}

export default Path
