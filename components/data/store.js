import { create } from 'zustand'
import Dataset from './dataset'
import { getClimStep } from '../utils/display'

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
  chunksToRender: [],
})

const createDisplaySlice = (set, get) => ({
  projection: 'mercator',
  basemaps: { landBoundaries: true, landMask: false, oceanMask: false },
  colormap: 'cool',
  clim: null,
  climStep: 1,
  centerPoint: null,
  zoom: 0,
  scrubbing: false,
  setProjection: (projection) => set({ projection }),
  setBasemaps: (basemaps) =>
    set((prev) => ({ basemaps: { ...prev.basemaps, ...basemaps } })),
  setColormap: (colormap) => set({ colormap }),
  setClim: (clim, resetStep) =>
    set({ clim, ...(resetStep && { climStep: getClimStep(clim) }) }),
  setScrubbing: (scrubbing) => set({ scrubbing }),
})

const createPlotsSlice = (set, get) => ({
  plotMode: 'inactive',
  plotCenter: null,
  plotData: null,
  setPlotMode: (plotMode) => set({ plotMode }),
  setPlotCenter: (plotCenter) => set({ plotCenter }),
  setPlotData: (plotData) => set({ plotData }),
})

const useStore = create((set, get) => ({
  ...createDatasetSlice(set, get),
  ...createDisplaySlice(set, get),
  ...createPlotsSlice(set, get),
  setUrl: async (url, { metadata, clim, pyramid } = {}) => {
    const { _registerLoading, _unregisterLoading } = get()
    set({
      error: null,
      // Null out all dataset-related fields
      dataset: null,
      selectors: [],
      chunksToRender: [],
      clim: null,
      climStep: 1,
      projection: 'mercator',
      plotData: null,
    })

    // handle clearing url
    if (!url) {
      return
    }

    _registerLoading('metadata')
    let dataset
    try {
      dataset = new Dataset(url, metadata, pyramid)
      await dataset.initialize()
      set({ dataset })
    } catch (e) {
      set({ error: e.message })
      _unregisterLoading('metadata')
      return
    }

    // default to first variable
    const initialVariable = dataset.variables[0]

    get().setVariable(initialVariable, { clim })
    _unregisterLoading('metadata')
  },
  setVariable: async (name, { clim: urlClim } = {}) => {
    const { dataset, centerPoint, zoom, _registerLoading, _unregisterLoading } =
      get()
    set({
      // Null out variable-specific fields
      selectors: [],
      chunksToRender: [],
      clim: null,
    })
    _registerLoading(name)

    let cp
    try {
      const { centerPoint: variableCenterPoint, selectors } =
        await dataset.initializeVariable(name)
      set({ selectors })
      cp = centerPoint ?? variableCenterPoint
    } catch (e) {
      set({ error: e.message })
      _unregisterLoading(name)
      return
    }

    await dataset.updateSelection(cp, zoom, get().selectors)
    const clim = await dataset.getClim()
    set({ clim: urlClim ?? clim, climStep: getClimStep(urlClim ?? clim) })
    _unregisterLoading(name)

    get().resetMapProps(cp, zoom)
  },
  resetMapProps: async (centerPoint, zoom) => {
    const { dataset, selectors } = get()

    if (!dataset?.level || Object.keys(dataset.level.chunks).length === 0) {
      return
    }

    set({ centerPoint, zoom })
    await dataset.updateSelection(centerPoint, zoom, selectors)
    set({ chunksToRender: dataset.activeChunkKeys })
  },
  fetchChunk: async (chunkKey) => {
    const { dataset, _registerLoading, _unregisterLoading } = get()

    if (!dataset?.level?.headers || !dataset?.level?.variable?.name) {
      set({
        error: 'Tried to fetch chunk before store was fully initialized.',
      })
      return
    }

    _registerLoading(chunkKey)

    try {
      await dataset.fetchChunk(chunkKey)
      _unregisterLoading(chunkKey)
    } catch (e) {
      set({ error: 'Error loading data.' })
      _unregisterLoading(chunkKey)
    }
  },
  setSelector: async (index, values) => {
    const { dataset, selectors } = get()

    const updatedSelector = selectors[index]
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
    }

    if (shouldUpdate) {
      const updatedSelectors = [
        ...selectors.slice(0, index),
        updatedSelector,
        ...selectors.slice(index + 1),
      ]
      const { centerPoint, zoom } = get()

      await dataset.updateSelection(centerPoint, zoom, updatedSelectors)
      set({
        selectors: updatedSelectors,
        chunksToRender: dataset.activeChunkKeys,
      })
    }
  },
}))

export default useStore
