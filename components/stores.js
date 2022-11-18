import create from 'zustand'

export const useDisplayStore = create((set, get) => ({
  projection: 'naturalEarth1',
  basemaps: { land: true, ocean: false },
  clim: null,
  setProjection: (projection) => set({ projection }),
  setBasemaps: (basemaps) =>
    set((prev) => ({ basemaps: { ...prev.basemaps, ...basemaps } })),
  setClim: (clim) => set({ clim }),
}))
