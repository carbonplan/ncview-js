import create from 'zustand'
import {
  getAllData,
  getArrays,
  getMetadata,
  getVariableInfo,
  pointToChunkKey,
  toKeyArray,
  toKeyString,
} from './utils'

const createDatasetSlice = (set, get) => ({
  loading: false,
  error: null,

  // dataset
  url: null,
  metadata: null,
  apiMetadata: null,
  variables: [],
  arrays: {},
  headers: null,

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
      error: null,
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

    set({ loading: true })

    const { metadata, variables } = await getMetadata(url)
    if (variables.length === 0) {
      set({
        loading: false,
        error:
          'No viewable variables found. Please provide a dataset with 2D data arrays.',
      })
      return
    }
    const { arrays, headers } = await getArrays(
      url,
      metadata,
      variables,
      apiMetadata
    )

    set({ metadata, variables, arrays, headers })

    // default to first variable
    const initialVariable = variables[0]

    if (Object.keys(apiMetadata[initialVariable] ?? {}).length < 2) {
      set({
        loading: false,
        error: 'Unable to parse coordinates. Please use CF conventions.',
      })
      return
    }

    get().setVariable(initialVariable, !clim)
  },
  setVariable: async (name, overrideClim) => {
    set({
      variable: { name, selectors: [] },
      loading: true,
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
    get().setChunkKey(chunkKey, { overrideClim: true })
  },
  setChunkKey: async (chunkKey, { overrideClim, forceUpdate }) => {
    if (chunkKey === get().chunkKey && !forceUpdate) {
      return
    }

    set({
      chunkKey,
      loading: true,
      // Null out chunk-specific fields
      data: null,
      bounds: null,
    })

    try {
      const {
        data,
        bounds,
        clim,
        chunks: newChunks,
      } = await getAllData(chunkKey, get())
      const { chunks } = get()

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
    } catch (e) {
      set({ loading: false, error: 'Error loading data.' })
    }
  },
  resetCenterChunk: (centerPoint) => {
    const { variable, setChunkKey } = get()

    const newChunkKey = pointToChunkKey(centerPoint, variable)

    if (newChunkKey) {
      setChunkKey(newChunkKey, { overrideClim: false, forceUpdate: false }) // TODO: reinstate auto-updating clim after demo
    }
  },
  setSelector: (index, values) => {
    const { variable, chunkKey, setChunkKey } = get()

    const updatedSelector = variable.selectors[index]
    let updatedChunkKey = chunkKey
    let shouldUpdate = false

    if (
      typeof values.index === 'number' &&
      updatedSelector.index !== values.index
    ) {
      shouldUpdate = true
      updatedSelector.index = values.index
    }

    if (
      typeof values.chunk === 'number' &&
      updatedSelector.chunk !== values.chunk
    ) {
      shouldUpdate = true
      updatedSelector.chunk = values.chunk
      const chunkArray = toKeyArray(chunkKey, variable)
      chunkArray[index] = values.chunk
      updatedChunkKey = toKeyString(chunkArray, variable)
    }

    variable.selectors[index] = { ...variable.selectors[index], ...values }

    if (shouldUpdate) {
      set({ variable: { ...variable, selectors: variable.selectors } })
      setChunkKey(updatedChunkKey, { overrideClim: false, forceUpdate: true })
    }
  },
}))

export default useStore
