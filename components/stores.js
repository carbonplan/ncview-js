import create from 'zustand'

export const useDisplayStore = create((set, get) => ({
  projection: 'naturalEarth1',
  basemaps: { land: true, ocean: false },
  colormap: 'cool',
  clim: null,
  setProjection: (projection) => set({ projection }),
  setBasemaps: (basemaps) =>
    set((prev) => ({ basemaps: { ...prev.basemaps, ...basemaps } })),
  setColormap: (colormap) => set({ colormap }),
  setClim: (clim) => set({ clim }),
}))
