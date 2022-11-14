import { useCallback, useEffect, useRef, useState } from 'react'

import { Minimap, Path, Sphere, Raster } from '@carbonplan/minimaps'
import { useThemeUI, Box, Flex } from 'theme-ui'
import { Toggle, Select } from '@carbonplan/components'
import { useThemedColormap } from '@carbonplan/colormaps'
import { fetchData } from './utils'
import { PROJECTIONS } from './constants'

const Map = () => {
  const { theme } = useThemeUI()
  const colormap = useThemedColormap('cool', { count: 255, format: 'rgb' })
  const [data, setData] = useState()
  const [bounds, setBounds] = useState()
  const [northPole, setNorthPole] = useState(null)
  const [nullValue, setNullValue] = useState()
  const [clim, setClim] = useState()
  const [projection, setProjection] = useState('naturalEarth1')
  const getMapProps = useRef(null)
  const [mapProps, setMapProps] = useState({ scale: 1, translate: [0, 0] })
  const [basemaps, setBasemaps] = useState({
    land: true,
    ocean: false,
  })

  useEffect(() => {
    fetchData().then((result) => {
      setData(result.data)
      setBounds(result.bounds)
      setNullValue(result.nullValue)
      setClim(result.clim)
      setNorthPole(result.northPole)
      getMapProps.current = result.getMapProps
      setMapProps(getMapProps.current(projection))
    })
  }, [])

  const handleProjectionChange = useCallback((e) => {
    setProjection(e.target.value)
    if (getMapProps.current) {
      setMapProps(getMapProps.current(e.target.value))
    }
  })

  return (
    <>
      <Box sx={{ width: '200px', mt: [2], ml: [4] }}>
        <Select onChange={handleProjectionChange} value={projection}>
          <option value='naturalEarth1'>naturalEarth1</option>
          <option value='orthographic'>orthographic</option>
          <option value='mercator'>mercator</option>
          <option value='equirectangular'>equirectangular</option>
        </Select>

        <Flex sx={{ gap: 2 }}>
          Land
          <Toggle
            value={basemaps.land}
            onClick={() => setBasemaps((v) => ({ ...v, land: !v.land }))}
          />
        </Flex>

        <Flex sx={{ gap: 2 }}>
          Ocean
          <Toggle
            value={basemaps.ocean}
            onClick={() => setBasemaps((v) => ({ ...v, ocean: !v.ocean }))}
          />
        </Flex>
      </Box>

      <Box sx={{ width: '50%', ml: [4], mt: [6], mb: [3] }}>
        {data && bounds && clim && (
          <Minimap {...mapProps} projection={PROJECTIONS[projection]}>
            {basemaps.ocean && (
              <Path
                fill={theme.colors.background}
                opacity={1}
                source={
                  'https://storage.googleapis.com/carbonplan-maps/world-atlas/ocean-50m.json'
                }
                feature={'ocean'}
              />
            )}

            {basemaps.land && (
              <Path
                stroke={theme.colors.primary}
                source={
                  'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json'
                }
                feature={'land'}
                opacity={1}
              />
            )}

            <Sphere fill={theme.colors.background} />

            <Raster
              source={data}
              bounds={bounds}
              northPole={northPole}
              colormap={colormap}
              mode={'lut'}
              clim={clim}
              nullValue={nullValue}
            />
          </Minimap>
        )}
      </Box>
    </>
  )
}

export default Map
