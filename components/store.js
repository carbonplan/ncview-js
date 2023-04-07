import create from 'zustand'
import {
  getActiveChunkKeys,
  getArrays,
  getChunkData,
  getClim,
  getMetadata,
  getVariableInfo,
  pointToChunkKey,
  toKeyArray,
  toKeyString,
} from './utils'

const createDatasetSlice = (set, get) => ({
  // loading
  error: null,
  _loading: [],
  _registerLoading: (id) => set({ _loading: [...get()._loading, id] }),
  _unregisterLoading: (id) =>
    set({ _loading: get()._loading.filter((d) => d !== id) }),
  getLoading: () => get()._loading.length > 0,

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

  // central chunk
  chunkKey: null,
  // active chunks
  activeChunkKeys: [],
})

const createDisplaySlice = (set, get) => ({
  projection: 'naturalEarth1',
  basemaps: { landBoundaries: false, landMask: false, oceanMask: false },
  colormap: 'cool',
  clim: null,
  centerPoint: null,
  scrubbing: false,
  setProjection: (projection) => set({ projection }),
  setBasemaps: (basemaps) =>
    set((prev) => ({ basemaps: { ...prev.basemaps, ...basemaps } })),
  setColormap: (colormap) => set({ colormap }),
  setClim: (clim) => set({ clim }),
  setCenterPoint: (centerPoint) => set({ centerPoint }),
  setScrubbing: (scrubbing) => set({ scrubbing }),
})

const createPlotsSlice = (set, get) => ({
  mode: 'inactive',
  center: null,
  setMode: (mode) => set({ mode }),
  setCenter: (center) => set({ center }),
})

const useStore = create((set, get) => ({
  ...createDatasetSlice(set, get),
  ...createDisplaySlice(set, get),
  ...createPlotsSlice(set, get),
  setUrl: async (url, apiMetadata, clim) => {
    const { _registerLoading, _unregisterLoading } = get()
    set({
      url,
      apiMetadata,
      error: null,
      // Null out all dataset-related fields
      metadata: null,
      variables: [],
      variable: {},
      chunks: {},
      activeChunkKeys: [],
      clim,
    })

    // handle clearing url
    if (!url) {
      return
    }

    _registerLoading('metadata')

    const { metadata, variables } = await getMetadata(url)
    if (variables.length === 0) {
      set({
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
        error: 'Unable to parse coordinates. Please use CF conventions.',
      })
      _unregisterLoading('metadata')
      return
    }

    get().setVariable(initialVariable)
    _unregisterLoading('metadata')
  },
  setVariable: async (name) => {
    const { centerPoint, _registerLoading, _unregisterLoading } = get()
    set({
      variable: { name, selectors: [] },
      // Null out variable-specific fields
      chunkKey: null,
      chunks: {},
      activeChunkKeys: [],
      clim: null,
    })
    _registerLoading(name)

    const {
      centerPoint: variableCenterPoint,
      nullValue,
      northPole,
      axes,
      lockZoom,
      selectors,
      chunk_separator,
      chunk_shape,
      shape,
      array,
    } = await getVariableInfo(name, get())

    const variable = {
      name,
      nullValue,
      northPole,
      axes,
      lockZoom,
      selectors,
      chunk_separator,
      chunk_shape,
      shape,
      array,
    }
    set({
      variable,
      ...(centerPoint ? {} : { centerPoint: variableCenterPoint }),
    })
    _unregisterLoading(name)

    let chunkKey
    if (centerPoint) {
      chunkKey = pointToChunkKey(centerPoint, variable)
    }
    if (!chunkKey) {
      chunkKey = pointToChunkKey(variableCenterPoint, variable)
    }

    get().setChunkKey(chunkKey, { initializeClim: true })
  },
  setChunkKey: async (chunkKey, { initializeClim }) => {
    const {
      chunkKey: existingChunkKey,
      _registerLoading,
      _unregisterLoading,
    } = get()
    if (chunkKey === existingChunkKey) {
      return
    }

    set({ chunkKey })
    _registerLoading(chunkKey)

    try {
      const activeChunkKeys = getActiveChunkKeys(chunkKey, get())
      const toSet = { activeChunkKeys }
      if (initializeClim) {
        const { clim, chunks: newChunks } = await getClim(
          activeChunkKeys,
          get()
        )
        const { chunks } = get()
        toSet.chunks = {
          ...chunks,
          ...newChunks,
        }
        toSet.clim = clim
      }

      set(toSet)
      _unregisterLoading(chunkKey)
    } catch (e) {
      set({ error: 'Error loading data.' })
      _unregisterLoading(chunkKey)
    }
  },
  resetCenterPoint: (centerPoint) => {
    const { variable, chunks, setChunkKey, setCenterPoint } = get()

    if (Object.keys(chunks).length === 0) {
      return
    }

    const newChunkKey = pointToChunkKey(centerPoint, variable)

    if (newChunkKey) {
      setCenterPoint(centerPoint)
      setChunkKey(newChunkKey, { initializeClim: false })
    }
  },
  fetchChunk: async (chunkKey) => {
    const {
      variable,
      headers,
      chunks: initialChunks,
      _registerLoading,
      _unregisterLoading,
    } = get()

    if (initialChunks[chunkKey]) {
      return
    }

    if (!headers || !variable.name) {
      set({
        error: 'Tried to fetch chunk before store was fully initialized.',
      })
      return
    }

    _registerLoading(chunkKey)

    try {
      const result = await getChunkData(chunkKey, { variable, headers })
      const { chunks } = get()
      _unregisterLoading(chunkKey)
      set({ chunks: { ...chunks, [chunkKey]: result } })
    } catch (e) {
      set({ error: 'Error loading data.' })
      _unregisterLoading(chunkKey)
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
      const chunkArray = toKeyArray(chunkKey, variable)
      chunkArray[index] = values.chunk
      updatedChunkKey = toKeyString(chunkArray, variable)
      updatedSelector.chunk = values.chunk
    }

    if (shouldUpdate) {
      const updatedSelectors = [
        ...variable.selectors.slice(0, index),
        updatedSelector,
        ...variable.selectors.slice(index + 1),
      ]
      set({ variable: { ...variable, selectors: updatedSelectors } })
      if (updatedChunkKey !== chunkKey) {
        setChunkKey(updatedChunkKey, { initializeClim: false })
      }
    }
  },
}))

export default useStore
