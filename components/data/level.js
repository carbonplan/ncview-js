import {
  getArrays,
  getChunkData,
  getClim,
  getVariableLevelInfo,
} from '../utils'

class Level {
  constructor(level, dataset) {
    this.level = level
    this.dataset = dataset
  }

  async initialize() {
    const { arrays, headers } = await getArrays(this.level, this.dataset)

    this.arrays = arrays
    this.headers = headers
  }

  async initializeVariable(variableName) {
    this.variable = {}
    this.chunks = {}
    const {
      centerPoint,
      axes,
      lockZoom,
      nullValue,
      chunk_separator,
      chunk_shape,
      shape,
      array,
    } = await getVariableLevelInfo(variableName, this, this.dataset)

    this.variable = {
      name: variableName,
      centerPoint,
      axes,
      lockZoom,
      nullValue,
      chunk_separator,
      chunk_shape,
      shape,
      array,
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

  async getClim(activeChunkKeys) {
    const { clim, chunks } = await getClim(activeChunkKeys, {
      chunks: this.chunks,
      level: this,
    })

    this.chunks = {
      ...this.chunks,
      ...chunks,
    }

    return clim
  }
}
export default Level
