import create from 'zustand'
import { fetchData } from './utils'

const createDatasetsSlice = (set, get) => ({
  url: null,
  variable: null,
  metadata: null,
  data: null,
  bounds: null,
  nullValue: null,
  northPole: null,
  setUrl: (url) => set({ url }),
  setVariable: (url) => set({ url }),
})

const createDisplaySlice = (set, get) => ({
  projection: 'naturalEarth1',
  basemaps: { land: true, ocean: false },
  colormap: 'cool',
  clim: null,
  setProjection: (projection) => set({ projection }),
  setBasemaps: (basemaps) =>
    set((prev) => ({ basemaps: { ...prev.basemaps, ...basemaps } })),
  setColormap: (colormap) => set({ colormap }),
  setClim: (clim) => set({ clim }),
})

const useStore = create((set, get) => ({
  ...createDatasetsSlice(set, get),
  ...createDisplaySlice(set, get),
  fetchData: async (url) => {
    const {
      variable,
      metadata,
      data,
      bounds,
      nullValue,
      clim,
      northPole,
      getMapProps,
    } = await fetchData(url)
    set({
      variable,
      metadata,
      data,
      bounds,
      nullValue,
      clim,
      northPole,
    })
    return getMapProps
  },
}))

export default useStore
