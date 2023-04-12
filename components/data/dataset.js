import {
  getActiveChunkKeys,
  getArrays,
  getChunkData,
  getClim,
  getMetadata,
  getVariableInfo,
  getVariableLevelInfo,
  pointToChunkKey,
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

class Dataset {
  constructor(url, apiMetadata, pyramid) {
    this.url = url
    this.apiMetadata = apiMetadata
    this.pyramid = pyramid
  }

  async initialize() {
    this.variable = {}
    this.chunks = {}
    const { metadata, variables, levels } = await getMetadata(
      this.url,
      this.pyramid
    )
    this.metadata = metadata
    this.variables = variables

    if (variables.length === 0) {
      throw new Error(
        'No viewable variables found. Please provide a dataset with at least 2D data arrays.'
      )
    }

    if (levels.length > 0) {
      this.levels = levels.reduce((accum, level) => {
        accum[level] = new Level(level, this)
        return accum
      }, {})
    } else {
      this.levels = { [0]: new Level(null, this) }
    }
    await Promise.all(
      Object.values(this.levels).map((level) => level.initialize())
    )
  }

  async initializeVariable(variableName) {
    this.variable = null
    await Promise.all(
      Object.values(this.levels).map((level) =>
        level.initializeVariable(variableName)
      )
    )
    const { selectorAxes, selectors } = await getVariableInfo(
      variableName,
      this.levels['0'],
      this
    )

    const level0 = this.levels['0'].variable

    this.selectorAxes = selectorAxes
    this.lockZoom = this.pyramid ? false : level0.lockZoom
    this.variable = variableName

    return { centerPoint: level0.centerPoint, selectors }
  }

  async updateSelection(centerPoint, zoom, selectors) {
    this.level = this.getLevel(zoom)
    this.chunkKey = pointToChunkKey(centerPoint, {
      selectors,
      variable: this.level.variable,
    })

    this.activeChunkKeys = getActiveChunkKeys(
      this.chunkKey,
      this.level.variable
    )
  }

  async getClim() {
    if (!this.level) {
      throw new Error('Tried to evaluate clim before levels initialized')
    }

    const clim = await this.level.getClim(this.activeChunkKeys)

    return clim
  }

  fetchChunk(chunkKey) {
    return this.level.fetchChunk(chunkKey)
  }

  // helpers

  getLevel(zoom) {
    return Object.values(this.levels).find((level, i) => {
      if (!this.levels[i + 1]) {
        return true
      } else {
        return (
          Number(level.level) <= zoom && Number(this.levels[i + 1].level > zoom)
        )
      }
    })
  }

  getZattrs(arrayName) {
    if (!this.metadata) {
      throw new Error('Tried to inspect units before dataset was initialized')
    }
    const prefix = this.pyramid ? '0/' : ''

    const zattrs = this.metadata.metadata[`${prefix}${arrayName}/.zattrs`]

    if (!zattrs) {
      throw new Error(`No .zattrs found for ${arrayName}`)
    }
    return zattrs
  }
}

export default Dataset
