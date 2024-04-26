import { inferCfAxes, getVariables } from '../utils/metadata'
import {
  getActiveChunkKeys,
  getVariableInfo,
  pointToChunkKey,
} from '../utils/data'

import Level from './level'

class Dataset {
  constructor(url, metadata, pyramid) {
    this.url = url
    this.metadata = metadata
    this.pyramid = pyramid
    this.cfAxes = inferCfAxes(metadata, pyramid)
  }

  async initialize() {
    this.variable = null
    this.chunks = {}
    const { variables, levels } = getVariables(
      this.metadata,
      this.cfAxes,
      this.pyramid
    )
    this.variables = variables
    this.variableMetadata = {}

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
    let metadata = this.variableMetadata[variableName]
    await Promise.all(
      Object.values(this.levels).map((level) =>
        level.initializeVariable(variableName)
      )
    )

    if (!metadata) {
      const { selectors } = await getVariableInfo(
        variableName,
        this.levels['0'],
        this
      )

      const level0 = this.levels['0'].variable

      metadata = {
        name: variableName,
        selectors,
        centerPoint: level0.centerPoint,
      }
      this.variableMetadata[variableName] = metadata
    }

    this.variable = variableName

    return { centerPoint: metadata.centerPoint, selectors: metadata.selectors }
  }

  updateSelection(centerPoint, zoom, selectors) {
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
