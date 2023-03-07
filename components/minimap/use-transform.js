import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMinimap } from './minimap'

const useTransform = () => {
  const ref = useRef(null)
  const [initialized, setInitialized] = useState(false)
  const {
    projection,
    scale: scaleProp,
    translate: translateProp,
    width,
    height,
    aspect,
  } = useMinimap()
  const [transform, setTransform] = useState(null)

  const getBBox = useMemo(
    () => () => {
      const {
        x,
        y,
        width: bWidth,
        height: bHeight,
      } = ref.current?.getBBox() ?? {}

      const hasValues = !!(bWidth || bHeight)
      if (!initialized && hasValues) {
        setInitialized(true)
      } else if (initialized && !hasValues) {
        setInitialized(false)
      }

      return {
        x,
        y,
        width: bWidth,
        height: bHeight,
      }
    },
    [initialized]
  )

  useEffect(() => {
    const scale = [
      (scaleProp * (width / (2 * Math.PI))) / projection.scale(),
      (scaleProp * ((height * (3 / 2 - aspect)) / Math.PI)) /
        projection.scale(),
    ]

    const { x, y, width: bWidth, height: bHeight } = getBBox()

    const translate = [
      (scale[0] - 1) * -x +
        (width - scale[0] * bWidth) / 2 +
        (translateProp[0] * width) / 2 -
        x,
      (scale[1] - 1) * -y +
        (height - scale[1] * bHeight) / 2 +
        (translateProp[1] * height) / 2 -
        y,
    ]

    setTransform(`translate(${translate.join(' ')}) scale(${scale.join(' ')})`)
  }, [getBBox, projection, scaleProp, translateProp, width, height, aspect])

  const componentRef = useCallback((node) => {
    ref.current = node
    setInitialized(true)
  }, [])

  return { transform: initialized ? transform : null, ref: componentRef }
}

export default useTransform
