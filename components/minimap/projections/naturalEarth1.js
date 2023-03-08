import { geoNaturalEarth1 } from 'd3-geo'
import { naturalEarth1Invert } from 'glsl-geo-projection'

export default function () {
  const projection = geoNaturalEarth1().precision(0.1)
  projection.glsl = { func: naturalEarth1Invert, name: 'naturalEarth1Invert' }
  projection.id = 'naturalEarth1'
  return projection
}
