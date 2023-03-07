import React, { useState, useEffect, createContext, useContext } from 'react'
import Regl from './regl'

const DEFAULTS = {
  naturalEarth1: {
    aspect: 0.5,
    scale: 1,
    translate: [0, 0],
  },
  orthographic: {
    aspect: 1,
    scale: 3,
    translate: [0, 0],
  },
  mercator: {
    aspect: 1,
    scale: 1,
    translate: [0, 0],
  },
  equirectangular: {
    aspect: 0.5,
    scale: 1,
    translate: [0, 0],
  },
}

const MinimapContext = createContext(null)

export const useMinimap = () => {
  return useContext(MinimapContext)
}

const WIDTH = 800

const Minimap = ({
  id,
  tabIndex,
  className,
  children,
  projection: getProjection,
  style,
  aspect: aspectProp,
  scale: scaleProp,
  translate: translateProp,
}) => {
  const [projection, setProjection] = useState(getProjection)
  const defaults = DEFAULTS[projection.id]
  const aspect = aspectProp || defaults.aspect
  const height = WIDTH * aspect

  useEffect(() => {
    const updatedProjection = getProjection()
    setProjection(() => updatedProjection)
  }, [getProjection])

  return (
    <MinimapContext.Provider
      value={{
        projection,
        translate: translateProp || defaults.translate,
        scale: scaleProp || defaults.scale,
        aspect,
        width: WIDTH,
        height,
      }}
    >
      <div
        id={id}
        tabIndex={tabIndex}
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          ...style,
        }}
      >
        <Regl
          aspect={aspect}
          style={{
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${height}`}
            style={{
              position: 'absolute',
              width: '100%',
              top: 0,
              left: 0,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {children}
          </svg>
        </Regl>
      </div>
    </MinimapContext.Provider>
  )
}

export default Minimap
