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
    this.variableMetadata = {}
  }

  async initializeVariable(variableName) {
    this.chunks = {}
    this.variable = this.variableMetadata[variableName]
    if (this.variable) {
      return
    }

    const {
      centerPoint,
      axes,
      lockZoom,
      nullValue,
      northPole,
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
      northPole,
      chunk_separator,
      chunk_shape,
      shape,
      array,
    }
    this.variableMetadata[variableName] = this.variable
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
