import create from 'zustand'
import {
  getArrays,
  getChunkKey,
  getData,
  getMetadata,
  getVariableInfo,
} from './utils'

const createDatasetSlice = (set, get) => ({
  // dataset
  url: null,
  metadata: null,
  isChunked: null,
  variables: [],
  arrays: {},

  // variable
  variable: {
    name: null,
    coordinates: [],
    nullValue: null,
    northPole: null,
  },

  // cache of chunks
  chunks: {},

  // active chunk
  chunkKey: null,
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
  setUrl: async (url) => {
    set({
      url,
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

    const { chunkKey, nullValue, northPole, coordinates } =
      await getVariableInfo(name, get())

    set({ variable: { name, nullValue, northPole, coordinates } })
    get().setChunkKey(chunkKey)
  },
  setChunkKey: async (chunkKey) => {
    const { variable, arrays, chunks } = get()

    if (chunks[chunkKey]) {
      set({ chunkKey })
      return
    }

    set({
      chunkKey,
      // Null out chunk-specific fields
      data: null,
      bounds: null,
      clim: null,
    })

    const { data, clim, bounds } = await getData(chunkKey, {
      arrays,
      variable,
    })

    set({
      data,
      clim,
      bounds,
      chunks: {
        ...chunks,
        [chunkKey]: { data, bounds },
      },
    })
  },
  incrementChunk: async (offset) => {
    const { chunkKey, variable, arrays, setChunkKey } = get()
    const dataArray = arrays[variable.name]
    const newChunkKey = getChunkKey(offset, {
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
