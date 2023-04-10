import FetchStore from 'zarrita/storage/fetch'

import {
  getActiveChunkKeys,
  getArrays,
  getChunkData,
  getClim,
  getMetadata,
  getVariableInfo,
  pointToChunkKey,
} from '../utils'

class Dataset {
  constructor(url, apiMetadata, pyramid) {
    this.url = url
    this.apiMetadata = apiMetadata
    this.pyramid = pyramid
  }

  async initialize() {
    this.variable = {}
    this.chunks = {}
    this.store = new FetchStore(this.url)
    const { metadata, variables } = await getMetadata(this.url)
    this.metadata = metadata
    this.variables = variables

    if (variables.length === 0) {
      throw new Error(
        'No viewable variables found. Please provide a dataset with at least 2D data arrays.'
      )
    }

    const { arrays, headers } = await getArrays(
      this.url,
      this.metadata,
      this.variables,
      this.apiMetadata
    )

    this.arrays = arrays
    this.headers = headers
  }

  async initializeVariable(variableName) {
    this.variable = {}
    this.chunks = {}
    const {
      centerPoint,
      nullValue,
      northPole,
      axes,
      lockZoom,
      selectors,
      chunk_separator,
      chunk_shape,
      shape,
      array,
    } = await getVariableInfo(variableName, this)

    this.variable = {
      name: variableName,
      nullValue,
      northPole,
      axes,
      lockZoom: this.pyramid ? false : lockZoom,
      // selectors,
      chunk_separator,
      chunk_shape,
      shape,
      array,
    }

    return { centerPoint, selectors }
  }

  async updateSelection(centerPoint, selectors, { initializeClim } = {}) {
    this.chunkKey = pointToChunkKey(centerPoint, {
      selectors,
      variable: this.variable,
    })

    this.activeChunkKeys = getActiveChunkKeys(this.chunkKey, this)
    if (initializeClim) {
      const { clim, chunks } = await getClim(this.activeChunkKeys, {
        chunks: this.chunks,
        dataset: this,
      })

      this.chunks = {
        ...this.chunks,
        ...chunks,
      }

      return clim
    }
  }

  async fetchChunk(chunkKey) {
    if (this.chunks[chunkKey]) {
      return
    }

    if (!this.headers || !this.variable?.name) {
      throw new Error(
        'Tried to fetch chunk before store was fully initialized.'
      )
    }

    const result = await getChunkData(chunkKey, this)

    this.chunks = {
      ...this.chunks,
      [chunkKey]: result,
    }
  }
}

export default Dataset
