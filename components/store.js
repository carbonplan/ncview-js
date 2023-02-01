import create from 'zustand'
import {
  getAllData,
  getArrays,
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
    selectors: [],
  },

  // cache of chunks
  chunks: {},

  // active chunk
  chunkKey: null,

  setLoading: (loading) => set({ loading }),
})

const createDisplaySlice = (set, get) => ({
  projection: 'naturalEarth1',
  basemaps: { landBoundaries: false, landMask: false, oceanMask: false },
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
  setUrl: async (url, apiMetadata, clim) => {
    set({
      url,
      apiMetadata,
      // Null out all dataset-related fields
      metadata: null,
      variables: [],
      variable: {},
      chunks: {},
      data: null,
      clim,
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
    const arrays = await getArrays(url, metadata, variables, apiMetadata)

    set({ metadata, variables, arrays })

    // default to first variable
    const initialVariable = variables[0]

    if (Object.keys(apiMetadata[initialVariable] ?? {}).length < 2) {
      return 'Unable to parse coordinates. Please use CF conventions.'
    }

    get().setVariable(initialVariable, !clim)
  },
  setVariable: async (name, overrideClim) => {
    set({
      variable: { name, selectors: [] },
      // Null out variable-specific fields
      chunkKey: null,
      chunks: {},
      data: null,
      ...(overrideClim ? { clim: null } : {}),
      bounds: null,
    })

    const {
      chunkKey,
      nullValue,
      northPole,
      axes,
      bounds,
      lockZoom,
      selectors,
      chunk_separator,
      chunk_shape,
      shape,
      array,
    } = await getVariableInfo(name, get())

    set({
      variable: {
        name,
        nullValue,
        northPole,
        axes,
        bounds,
        lockZoom,
        selectors,
        chunk_separator,
        chunk_shape,
        shape,
        array,
      },
    })
    get().setChunkKey(chunkKey, overrideClim)
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
      loading: false,
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

    const newChunkKey = pointToChunkKey(centerPoint, variable)

    if (newChunkKey) {
      setChunkKey(newChunkKey, false) // TODO: reinstate auto-updating clim after demo
    }
  },
}))

export default useStore
