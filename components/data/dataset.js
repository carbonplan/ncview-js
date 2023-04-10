import FetchStore from 'zarrita/storage/fetch'

import { getArrays, getMetadata, getVariableInfo } from '../utils'

class Dataset {
  constructor(url, apiMetadata) {
    this.url = url
    this.apiMetadata = apiMetadata
  }

  async initialize() {
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
      lockZoom,
      // selectors,
      chunk_separator,
      chunk_shape,
      shape,
      array,
    }

    return { centerPoint, selectors }
  }
}

export default Dataset
