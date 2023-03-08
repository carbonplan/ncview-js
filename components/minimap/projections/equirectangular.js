import { geoEquirectangular } from 'd3-geo'
import { equirectangularInvert } from 'glsl-geo-projection'

export default function () {
  const projection = geoEquirectangular().precision(0.1)
  projection.glsl = {
    func: equirectangularInvert,
    name: 'equirectangularInvert',
  }
  projection.id = 'equirectangular'
  return projection
}
