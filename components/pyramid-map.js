import { useCallback, useMemo } from 'react'
import { useThemeUI } from 'theme-ui'
import { useThemedColormap } from '@carbonplan/colormaps'
import {
  Map,
  Raster,
  Fill,
  Line,
  RegionPicker,
  useRegion,
} from '@carbonplan/maps'

import useStore from './data/store'
import { average, getPlotSelector } from './utils/plots'

const getSelector = (selectors, chunk_shape) => {
  return selectors
    .filter(
      (selector) =>
        typeof selector.chunk === 'number' && typeof selector.index === 'number'
    )
    .reduce(
      (accum, selector) => ({
        ...accum,
        [selector.name]:
          selector.metadata.array.data[
            selector.chunk * chunk_shape[selector.metadata.dimensionIndex] +
              selector.index
          ],
      }),
      {}
    )
}

const getRegionSelector = (selectors, chunk_shape) => {
  const base = selectors
    .filter(
      (selector) =>
        typeof selector.chunk === 'number' && typeof selector.index === 'number'
    )
    .reduce((accum, { name, metadata, chunk, index }) => {
      const chunkSize = chunk_shape[metadata.dimensionIndex]

      accum[name] = metadata.array.data[chunk * chunkSize + index]
      return accum
    }, {})

  const selector = getPlotSelector(selectors, chunk_shape)

  if (selector) {
    const chunkSize = chunk_shape[selector.metadata.dimensionIndex]
    return {
      ...base,
      [selector.name]: Array(chunkSize)
        .fill(null)
        .map(
          (d, i) => selector.metadata.array.data[selector.chunk * chunkSize + i]
        ),
    }
  } else {
    return null
  }
}

// TODO
// 1. (eventually) infer value of Zarr `version` prop ('v2' vs 'v3')
const RasterWrapper = () => {
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
  const setPlotData = useStore((state) => state.setPlotData)
  const xOrder = useStore(() =>
    useStore((state) =>
      state.dataset?.level?.variable?.axes?.X?.reversed ? -1 : 1
    )
  )
  const { region } = useRegion()

  const yOrder = useStore(() =>
    useStore((state) =>
      // Orientation expectations are swapped for minimap Raster relative to maps Raster
      state.dataset?.level?.variable?.axes?.Y?.reversed ? 1 : -1
    )
  )

  const selectorHash = useMemo(
    () => getSelector(selectors, chunk_shape),
    [selectors, chunk_shape]
  )

  const regionOptionsSelector = useMemo(
    () => getRegionSelector(selectors, chunk_shape),
    [selectors, chunk_shape]
  )

  const setRegionData = useCallback(
    (regionData) => {
      const variable = dataset.level?.variable

      if (!variable || !regionData?.value || !regionData.value[variable.name]) {
        return
      }

      const circleInfo = {
        centerPoint: [
          region?.properties?.center?.lng,
          region?.properties?.center?.lat,
        ],
        radius: region?.properties?.radius,
        units: region?.properties?.units,
        area: region?.properties?.area,
      }

      // Handle 2D pyramid
      if (Array.isArray(regionData.value[variable.name])) {
        setPlotData({
          yValues: [
            average(regionData.value[variable.name], {
              variable,
              coordinates: regionData.value.coordinates,
              zoom: region?.properties?.zoom,
            }),
          ],
          range: null,
          selectorName: null,
          circleInfo,
        })
        return
      }

      // Handle 3D+ pyramids
      const selectorName = Object.keys(regionOptionsSelector).find((key) =>
        Array.isArray(regionOptionsSelector[key])
      )
      const coordinateValues = regionOptionsSelector[selectorName]

      const unweighted = coordinateValues.map((coord) => {
        const arrayAtCoord = regionData.value[variable.name][coord]
        return average(arrayAtCoord, {
          variable,
          coordinates: regionData.value.coordinates,
          zoom: region?.properties?.zoom,
        })
      })

      const range = unweighted.reduce(
        ([min, max], d) => [Math.min(d, min), Math.max(d, max)],
        [Infinity, -Infinity]
      )

      setPlotData({
        yValues: unweighted,
        range,
        selectorName,
        circleInfo,
      })
    },
    [
      setPlotData,
      regionOptionsSelector,
      selectors,
      dataset.level?.variable,
      region,
    ]
  )
  return clim ? (
    <Raster
      colormap={colormap}
      clim={clim}
      mode='texture'
      source={dataset.url}
      variable={dataset.variable}
      selector={selectorHash}
      order={[xOrder, yOrder]}
      regionOptions={{
        setData: setRegionData,
        selector: regionOptionsSelector,
      }}
    />
  ) : null
}

const PyramidMap = () => {
  const { theme } = useThemeUI()
  const basemaps = useStore((state) => state.basemaps)
  const plotMode = useStore((state) => state.plotMode)

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

      <RasterWrapper />
    </Map>
  )
}

export default PyramidMap
