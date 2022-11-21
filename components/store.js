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
      let metadata
      let variable
      let variables
      const { metadata: existingMetadata } = initialValues

      if (!existingMetadata) {
        const result = await getMetadata(url)
        metadata = result.metadata
        variables = result.variables

        // default to look at last variable
        variable = variables[variables.length - 1]
      } else {
        metadata = initialValues.metadata
        variables = initialValues.variables
        variable = initialValues.variable
      }

      const { data, bounds, nullValue, clim, northPole, getMapProps } =
        await fetchData(url, metadata, variable)
      set({
        variable,
        variables,
        metadata,
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
