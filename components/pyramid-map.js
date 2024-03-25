import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Flex, useThemeUI } from 'theme-ui'
import { alpha } from '@theme-ui/color'
import { useThemedColormap } from '@carbonplan/colormaps'
import { Map, Raster, Fill, Line } from '@carbonplan/maps'

import useStore from './data/store'

const PyramidMap = () => {
  const { theme } = useThemeUI()
  const basemaps = useStore((state) => state.basemaps)
  const dataset = useStore((state) => state.dataset)
  const selectors = useStore((state) => state.selectors)
  const colormapName = useStore((state) => state.colormap)
  const colormap = useThemedColormap(colormapName, {
    count: 255,
    format: 'rgb',
  })
  const clim = useStore((state) => state.clim)

  const selectorHash = useMemo(() => {
    return selectors
      .filter((s) => typeof s.chunk === 'number' && typeof s.index === 'number')
      .reduce(
        (accum, selector) => ({
          ...accum,
          [selector.name]:
            selector.metadata.array.data[selector.chunk + selector.index],
        }),
        {}
      )
  }, [selectors])

  // TODO
  // 1. infer value of `order` prop (handle flipped lat, lon coordinates)
  // 2. infer value of `projection` prop
  // 3. (eventually) infer value of Zarr `version` prop ('v2' vs 'v3')

  return (
    <Map>
      {basemaps.oceanMask && (
        <Fill
          color={theme.rawColors.background}
          source={
            'https://carbonplan-maps.s3.us-west-2.amazonaws.com/basemaps/ocean'
          }
          variable={'ocean'}
        />
      )}

      {basemaps.landMask && (
        <Fill
          color={theme.rawColors.background}
          source={
            'https://carbonplan-maps.s3.us-west-2.amazonaws.com/basemaps/land'
          }
          variable={'land'}
        />
      )}

      {basemaps.landBoundaries && (
        <Line
          color={theme.rawColors.primary}
          source={
            'https://carbonplan-maps.s3.us-west-2.amazonaws.com/basemaps/land'
          }
          variable={'land'}
        />
      )}

      {clim && (
        <Raster
          colormap={colormap}
          clim={clim}
          mode='texture'
          source={dataset.url}
          variable={dataset.variable}
          selector={selectorHash}
        />
      )}
    </Map>
  )
}

export default PyramidMap
