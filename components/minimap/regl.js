import React, {
  createContext,
  useCallback,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react'
import _regl from 'regl'

export const ReglContext = createContext(null)

export const useRegl = () => {
  return useContext(ReglContext)
}

const Regl = ({ style, aspect, children }) => {
  const regl = useRef()
  const container = useRef(null)
  const resize = useRef()
  const [ready, setReady] = useState(false)
  const [viewport, setViewport] = useState({ width: null, height: null })

  useEffect(() => {
    resize.current = () => {
      container.current.style.height =
        container.current.offsetWidth * aspect + 'px'

      setViewport({
        height: container.current.offsetWidth
          ? container.current.offsetWidth * aspect
          : container.current.style.height,
        width: container.current.offsetWidth,
      })
    }
    window.addEventListener('resize', resize.current)
    resize.current()

    if (!regl.current) {
      regl.current = _regl({
        container: container.current,
        extensions: ['OES_texture_float', 'OES_element_index_uint'],
      })
      setReady(true)
    }

    return () => {
      window.removeEventListener('resize', resize.current)
    }
  }, [aspect])

  useEffect(() => {
    return () => {
      if (regl.current) regl.current.destroy()
      setReady(false)
    }
  }, [])

  return (
    <ReglContext.Provider
      value={{
        regl: regl.current,
        viewport,
      }}
    >
      <div style={{ width: '100%', ...style }} ref={container} />
      {ready && children}
    </ReglContext.Provider>
  )
}

export default Regl
