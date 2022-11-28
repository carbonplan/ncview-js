import create from 'zustand'
import { fetchData, getMetadata } from './utils'

const createDatasetsSlice = (set, get) => ({
  url: null,
  variable: null,
  variables: [],
  metadata: null,
  data: null,
  bounds: null,
  nullValue: null,
  northPole: null,
  setUrl: (url) =>
    set({
      url,
      // Null out all dataset-related fields
      variable: null,
      variables: [],
      metadata: null,
      data: null,
      bounds: null,
      nullValue: null,
      northPole: null,
    }),
  setVariable: (variable) =>
    set({
      variable,
      // Null out variable-specific fields
      data: null,
      bounds: null,
      nullValue: null,
      northPole: null,
    }),
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
  fetchData: async () => {
    const initialValues = get()
    const { url } = initialValues
    if (url && !initialValues.data) {
      let latestValues = initialValues

      if (!initialValues.metadata) {
        const { metadata, variables } = await getMetadata(url)
        latestValues = {
          metadata,
          variables,
          // default to look at last variable
          variable: variables[variables.length - 1],
        }
      }

      const { data, bounds, nullValue, clim, northPole, getMapProps } =
        await fetchData(url, latestValues.metadata, latestValues.variable)
      set({
        ...latestValues,
        data,
        bounds,
        nullValue,
        clim,
        northPole,
      })
      return getMapProps
    }
  },
}))

export default useStore
