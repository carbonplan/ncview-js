import create from 'zustand'
import {
  getArrays,
  getChunkKey,
  getData,
  getMetadata,
  getVariableInfo,
} from './utils'

const createDatasetsSlice = (set, get) => ({
  url: null,
  isChunked: null,
  variable: null,
  variables: [],
  metadata: null,
  data: null,
  bounds: null,
  nullValue: null,
  northPole: null,
  arrays: {},
  chunkKey: [],
  coordinates: [],
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
  setUrl: async (url) => {
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
      arrays: {},
      chunkKey: [],
      coordinates: [],
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
      variable,
      variables,
      isChunked,
      arrays,
      // variable info
      chunkKey,
      nullValue,
      northPole,
      coordinates,
      // chunk info
      data,
      clim,
      bounds,
      getMapProps,
    })
  },
  setVariable: async (variable) => {
    set({
      variable,
      // Null out variable-specific fields
      chunkKey: [],
      coordinates: [],
      data: null,
      bounds: null,
      nullValue: null,
      northPole: null,
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
      chunkKey,
      nullValue,
      northPole,
      coordinates,
      // chunk info
      data,
      clim,
      bounds,
      getMapProps,
    })
  },
  setChunkKey: async (chunkKey) => {
    set({
      chunkKey,
      // Null out chunk-specific fields
      data: null,
      bounds: null,
      clim: null,
      getMapProps: null,
    })

    const { data, clim, bounds, getMapProps } = await getData(chunkKey, get())

    set({ data, clim, bounds, getMapProps })
  },
  incrementChunk: async (offset) => {
    const { chunkKey, variable, arrays, setChunkKey } = get()
    const dataArray = arrays[variable]
    const newChunkKey = getChunkKey(offset, {
      chunkKey,
      chunk: dataArray.chunk_shape,
      shape: dataArray.shape,
    })

    if (newChunkKey) {
      setChunkKey(newChunkKey)
    }
  },
}))

export default useStore
