import create from 'zustand'
import {
  getAllData,
  getArrays,
  getAdjacentChunk,
  getMetadata,
  getVariableInfo,
} from './utils'

const createDatasetSlice = (set, get) => ({
  loading: false,

  // dataset
  url: null,
  metadata: null,
  apiMetadata: null,
  isChunked: null,
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
      apiMetadata, // TODO: actually fetch this from the API
      // Null out all dataset-related fields
      metadata: null,
      isChunked: null,
      variables: [],
      variable: {},
      chunks: {},
      data: null,
      clim: null,
      bounds: null,
    })

    if (!url) {
      throw new Error('Tried to initializeStore, but no url provided')
    }

    const { metadata, variables, isChunked } = await getMetadata(url)
    const arrays = await getArrays(url, metadata, variables)

    set({ metadata, variables, isChunked, arrays })

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
    get().setChunkKey(chunkKey)
  },
  setChunkKey: async (chunkKey) => {
    if (get().chunkKey === chunkKey) {
      return
    }

    const { variable, arrays, chunks } = get()

    set({
      chunkKey,
      // Null out chunk-specific fields
      data: null,
      bounds: null,
      clim: null,
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
      clim,
      bounds,
      chunks: {
        ...chunks,
        ...newChunks,
      },
    })
  },
  incrementChunk: async (offset) => {
    const { chunkKey, variable, arrays, setChunkKey } = get()
    const dataArray = arrays[variable.name]
    const newChunkKey = getAdjacentChunk(offset, {
      chunkKey,
      chunk: dataArray.chunk_shape,
      shape: dataArray.shape,
      arrays,
      variable: variable.name,
    })

    if (newChunkKey) {
      setChunkKey(newChunkKey)
    }
  },
}))

export default useStore
