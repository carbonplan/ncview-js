import { useContext, useEffect, useRef } from 'react'
import { useRegl } from './regl'
import { LayerContext } from './layer'

const Tile = ({ id, source, bounds }) => {
  const { invalidate, registerTile, unregisterTile } = useContext(LayerContext)
  const { regl } = useRegl()

  const texture = useRef()
  const boundsRef = useRef(null)

  useEffect(() => {
    texture.current ||= regl.texture({
      width: 1,
      height: 1,
      data: [0, 0, 0, 0],
    })
    return () => {
      unregisterTile(id)
      invalidate('on unload')
    }
  }, [])

  useEffect(() => {
    // handle loading synchronously from pre-fetched zarr data
    texture.current(source)
    if (texture.current && boundsRef.current) {
      registerTile(id, { texture: texture.current, bounds: boundsRef.current })
    }
    invalidate('on zarr array read')
  }, [id, source])

  useEffect(() => {
    if (bounds) {
      boundsRef.current = [
        bounds.lat[0],
        bounds.lat[1],
        bounds.lon[0],
        bounds.lon[1],
      ]
      if (texture.current && boundsRef.current) {
        registerTile(id, {
          texture: texture.current,
          bounds: boundsRef.current,
        })
      }
    }
    invalidate('on bounds change')
  }, [
    id,
    bounds && bounds.lat[0],
    bounds && bounds.lat[1],
    bounds && bounds.lon[0],
    bounds && bounds.lon[1],
  ])

  return null
}

export default Tile
