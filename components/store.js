import create from 'zustand'
import {
  getArrays,
  getChunkKey,
  getData,
  getMetadata,
  getVariableInfo,
  toKeyString,
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
    })

    if (!url) {
      throw new Error('Tried to initializeStore, but no url provided')
    }

    const { metadata, variables, isChunked } = await getMetadata(url)
    const arrays = await getArrays(url, metadata, variables)

    // default to first variable
    const variable = variables[0]

    const { chunkKey, nullValue, northPole, coordinates } =
      await getVariableInfo(variable, { arrays, metadata, isChunked })

    const { data, clim, bounds, getMapProps } = await getData(chunkKey, {
      arrays,
      coordinates,
      variable,
    })

    set({
      // store info
      metadata,
      variables,
      isChunked,
      arrays,
      // variable info
      variable: {
        name: variable,
        coordinates,
        nullValue,
        northPole,
      },
      // chunk info
      chunkKey,
      chunks: {
        [chunkKey]: { data, bounds },
      },
      clim,
      getMapProps,
    })
  },
  setVariable: async (variable) => {
    set({
      variable: { name: variable },
      data: {},
      // Null out variable-specific fields
      chunkKey: null,
    })

    const { chunkKey, nullValue, northPole, coordinates } =
      await getVariableInfo(variable, get())

    const { data, clim, bounds, getMapProps } = await getData(chunkKey, {
      ...get(),
      coordinates,
      variable,
    })

    set({
      // variable info
      variable: { name: variable, nullValue, northPole, coordinates },
      chunkKey,
      chunks: {
        [chunkKey]: { data, bounds },
      },

      // chunk info
      clim,
      getMapProps,
    })
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
      clim: null,
      getMapProps: null,
    })

    const { data, clim, bounds, getMapProps } = await getData(chunkKey, {
      arrays,
      coordinates: variable.coordinates,
      variable: variable.name,
    })

    set({
      clim,
      getMapProps,
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
