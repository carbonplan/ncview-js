import { useMemo } from 'react'
import { useThemeUI } from 'theme-ui'
import { useThemedColormap } from '@carbonplan/colormaps'
import { Map, Raster, Fill, Line, RegionPicker } from '@carbonplan/maps'

import useStore from './data/store'

const PyramidMap = () => {
  const { theme } = useThemeUI()
  const basemaps = useStore((state) => state.basemaps)
  const dataset = useStore((state) => state.dataset)
  const chunk_shape = useStore(
    (state) => state.dataset.level?.variable?.chunk_shape
  )
  const selectors = useStore((state) => state.selectors)
  const colormapName = useStore((state) => state.colormap)
  const colormap = useThemedColormap(colormapName, {
    count: 255,
    format: 'rgb',
  })
  const clim = useStore((state) => state.clim)
  const plotMode = useStore((state) => state.plotMode)
  const setPlotData = useStore((state) => state.setPlotData)
  const xOrder = useStore(() =>
    useStore((state) =>
      state.dataset?.level?.variable?.axes?.X?.reversed ? -1 : 1
    )
  )
  const yOrder = useStore(() =>
    useStore((state) =>
      // Orientation expectations are swapped for minimap Raster relative to maps Raster
      state.dataset?.level?.variable?.axes?.Y?.reversed ? 1 : -1
    )
  )

  const selectorHash = useMemo(
    () =>
      selectors
        .map((selector, index) => ({ selector, index }))
        .filter(
          ({ selector }) =>
            typeof selector.chunk === 'number' &&
            typeof selector.index === 'number'
        )
        .reduce(
          (accum, { selector, index }) => ({
            ...accum,
            [selector.name]:
              selector.metadata.array.data[
                selector.chunk * chunk_shape[index] + selector.index
              ],
          }),
          {}
        ),
    [selectors, chunk_shape]
  )

  const regionOptionsSelector = useMemo(
    () =>
      selectors
        .map((selector, index) => ({ selector, index }))
        .filter(
          ({ selector }) =>
            typeof selector.chunk === 'number' &&
            typeof selector.index === 'number'
        )
        .reduce(
          (accum, { selector, index }) => ({
            ...accum,
            [selector.name]: Array(chunk_shape[index])
              .fill(null)
              .map(
                (d, i) =>
                  selector.metadata.array.data[
                    selector.chunk * chunk_shape[index] + i
                  ]
              ),
          }),
          {}
        ),
    [selectors]
  )

  // TODO
  // 1. (eventually) infer value of Zarr `version` prop ('v2' vs 'v3')

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

      {plotMode === 'circle' && (
        <RegionPicker
          color={theme.colors.primary}
          backgroundColor={theme.colors.background}
          fontFamily={theme.fonts.mono}
          fontSize={'14px'}
          maxRadius={2000}
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
          order={[xOrder, yOrder]}
          regionOptions={{
            setData: setPlotData,
            selector: regionOptionsSelector,
          }}
        />
      )}
    </Map>
  )
}

export default PyramidMap
