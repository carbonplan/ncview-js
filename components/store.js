import create from 'zustand'
import {
  getAllData,
  getArrays,
  getAdjacentChunk,
  getMetadata,
  getVariableInfo,
  pointToChunkKey,
} from './utils'

const createDatasetSlice = (set, get) => ({
  loading: false,

  // dataset
  url: null,
  metadata: null,
  apiMetadata: null,
  variables: [],
  arrays: {},

  // variable
  variable: {
    name: null,
    axes: {},
    nullValue: null,
    northPole: null,
  },

  // cache of chunks
  chunks: {},

  // active chunk
  chunkKey: null,

  setLoading: (loading) => set({ loading }),
})

const createDisplaySlice = (set, get) => ({
  projection: 'naturalEarth1',
  basemaps: { land: true, ocean: false },
  colormap: 'cool',
  clim: null,
  data: null,
  bounds: null,
  setProjection: (projection) => set({ projection }),
  setBasemaps: (basemaps) =>
    set((prev) => ({ basemaps: { ...prev.basemaps, ...basemaps } })),
  setColormap: (colormap) => set({ colormap }),
  setClim: (clim) => set({ clim }),
})

const useStore = create((set, get) => ({
  ...createDatasetSlice(set, get),
  ...createDisplaySlice(set, get),
  setUrl: async (url, apiMetadata) => {
    set({
      url,
      apiMetadata,
      // Null out all dataset-related fields
      metadata: null,
      variables: [],
      variable: {},
      chunks: {},
      data: null,
      clim: null,
      bounds: null,
    })

    // handle clearing url
    if (!url) {
      return
    }

    const { metadata, variables } = await getMetadata(url)
    if (variables.length === 0) {
      return 'No viewable variables found. Please provide a dataset with 2D data arrays.'
    }
    const arrays = await getArrays(url, metadata, variables)

    set({ metadata, variables, arrays })

    // default to first variable
    get().setVariable(variables[0])
  },
  setVariable: async (name) => {
    set({
      variable: { name },
      // Null out variable-specific fields
      chunkKey: null,
      chunks: {},
      data: null,
      clim: null,
      bounds: null,
    })

    const { chunkKey, nullValue, northPole, axes, bounds } =
      await getVariableInfo(name, get())

    set({
      variable: { name, nullValue, northPole, axes, bounds },
    })
    get().setChunkKey(chunkKey, true)
  },
  setChunkKey: async (chunkKey, overrideClim = false) => {
    if (get().chunkKey === chunkKey) {
      return
    }

    const { variable, arrays, chunks } = get()

    set({
      chunkKey,
      // Null out chunk-specific fields
      data: null,
      bounds: null,
      ...(overrideClim ? { clim: null } : {}),
    })

    const {
      data,
      bounds,
      clim,
      chunks: newChunks,
    } = await getAllData(chunkKey, {
      chunks,
      arrays,
      variable,
    })

    set({
      data,
      bounds,
      chunks: {
        ...chunks,
        ...newChunks,
      },
      ...(overrideClim ? { clim } : {}),
    })
  },
  resetCenterChunk: (centerPoint) => {
    const { variable, arrays, setChunkKey } = get()

    const newChunkKey = pointToChunkKey(centerPoint, { arrays, variable })

    if (newChunkKey) {
      setChunkKey(newChunkKey)
    }
  },
}))

export default useStore
