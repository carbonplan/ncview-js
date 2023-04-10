import create from 'zustand'
import Dataset from './data/dataset'
import {
  getActiveChunkKeys,
  getChunkData,
  getClim,
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

  dataset: null,
  selectors: [],

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
      error: null,
      // Null out all dataset-related fields
      dataset: null,
      selectors: [],
      chunks: {},
      activeChunkKeys: [],
      clim,
    })

    // handle clearing url
    if (!url) {
      return
    }

    _registerLoading('metadata')
    let dataset
    try {
      dataset = new Dataset(url, apiMetadata)
      await dataset.initialize()
      set({ dataset })
    } catch (e) {
      set({ error: e.message })
      _unregisterLoading('metadata')
      return
    }

    // default to first variable
    const initialVariable = dataset.variables[0]

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
    const { dataset, centerPoint, _registerLoading, _unregisterLoading } = get()
    set({
      // Null out variable-specific fields
      selectors: [],
      chunkKey: null,
      chunks: {},
      activeChunkKeys: [],
      clim: null,
    })
    _registerLoading(name)

    const { centerPoint: variableCenterPoint, selectors } =
      await dataset.initializeVariable(name)

    set({
      selectors,
      ...(centerPoint ? {} : { centerPoint: variableCenterPoint }),
    })
    _unregisterLoading(name)

    let chunkKey
    if (centerPoint) {
      chunkKey = pointToChunkKey(centerPoint, {
        selectors,
        variable: dataset.variable,
      })
    }
    if (!chunkKey) {
      chunkKey = pointToChunkKey(variableCenterPoint, {
        selectors,
        variable: dataset.variable,
      })
    }

    get().setChunkKey(chunkKey, { initializeClim: true })
  },
  setChunkKey: async (chunkKey, { initializeClim }) => {
    const {
      dataset,
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
      const activeChunkKeys = getActiveChunkKeys(chunkKey, dataset)
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
    const { dataset, chunks, selectors, setChunkKey, setCenterPoint } = get()

    if (Object.keys(chunks).length === 0) {
      return
    }

    const newChunkKey = pointToChunkKey(centerPoint, {
      variable: dataset.variable,
      selectors,
    })

    if (newChunkKey) {
      setCenterPoint(centerPoint)
      setChunkKey(newChunkKey, { initializeClim: false })
    }
  },
  fetchChunk: async (chunkKey) => {
    const {
      dataset,
      chunks: initialChunks,
      _registerLoading,
      _unregisterLoading,
    } = get()

    if (initialChunks[chunkKey]) {
      return
    }

    if (!dataset?.headers || !dataset?.variable?.name) {
      set({
        error: 'Tried to fetch chunk before store was fully initialized.',
      })
      return
    }

    _registerLoading(chunkKey)

    try {
      const result = await getChunkData(chunkKey, dataset)
      const { chunks } = get()
      _unregisterLoading(chunkKey)
      set({ chunks: { ...chunks, [chunkKey]: result } })
    } catch (e) {
      set({ error: 'Error loading data.' })
      _unregisterLoading(chunkKey)
    }
  },
  setSelector: (index, values) => {
    const { dataset, selectors, chunkKey, setChunkKey } = get()

    const updatedSelector = selectors[index]
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
      const chunkArray = toKeyArray(chunkKey, dataset.variable)
      chunkArray[index] = values.chunk
      updatedChunkKey = toKeyString(chunkArray, dataset.variable)
      updatedSelector.chunk = values.chunk
    }

    if (shouldUpdate) {
      const updatedSelectors = [
        ...selectors.slice(0, index),
        updatedSelector,
        ...selectors.slice(index + 1),
      ]
      set({ selectors: updatedSelectors })
      if (updatedChunkKey !== chunkKey) {
        setChunkKey(updatedChunkKey, { initializeClim: false })
      }
    }
  },
}))

export default useStore
