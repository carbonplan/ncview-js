import { sanitizeUrl } from './url'

const fetchMetadata = (path) => {
  const reqUrl = new URL(`/api/metadata`, window.location.origin)

  const params = new URLSearchParams()
  params.append('path', path)
  reqUrl.search = params.toString()

  return fetch(reqUrl)
}

export const inspectDataset = async (url) => {
  // fetch zmetadata to figure out compression and variables
  const sanitized = sanitizeUrl(url)

  let response
  try {
    response = await fetchMetadata(sanitized)
  } catch (e) {
    // Show generic error message when request fails before response can be inspected.
    throw new Error(
      'A network error occurred. This could be a CORS issue or a dropped internet connection.'
    )
  }

  if (!response.ok) {
    const statusText = response.statusText ?? 'Dataset request failed.'
    if (response.status === 403) {
      throw new Error(
        `STATUS 403: Access forbidden. Ensure that URL is correct and that dataset is publicly accessible.`
      )
    } else if (response.status === 404) {
      throw new Error(
        `STATUS 404: ${statusText} Ensure that URL path is correct.`
      )
    } else {
      throw new Error(
        `STATUS ${response.status}: ${statusText}. URL: ${sanitized}`
      )
    }
  }
  let metadata = await response.json()

  if (!metadata.metadata) {
    throw new Error(metadata?.message || 'Unable to parse metadata')
  }

  let pyramid = false
  let visualizedUrl = sanitized

  const multiscales = metadata.metadata['.zattrs']['multiscales']
  if (multiscales) {
    pyramid = true
  }

  return { url: visualizedUrl, metadata, pyramid }
}

// Infer axes from consolidated metadata
export const inferCfAxes = (metadata, pyramid) => {
  const prefix = pyramid ? '0/' : ''
  const suffix = '/.zattrs'

  return Object.keys(metadata.metadata)
    .map((k) => {
      if (!k.endsWith(suffix)) {
        return false
      }

      if (prefix && !k.startsWith(prefix)) {
        return false
      }

      const variablePath = k.replace(prefix, '')
      const variable = variablePath.replace(suffix, '')

      if (!variable) {
        return false
      }

      const attrs = metadata.metadata[k]

      if (!attrs?._ARRAY_DIMENSIONS) {
        return false // skip if there no array dimensions
      }

      const dims = attrs['_ARRAY_DIMENSIONS']
      const axisInfo = dims.reduce((accum, dim) => {
        const dimAttrsPath = `${prefix}${dim}${suffix}`
        const dimAttrs = metadata.metadata[dimAttrsPath]
        if (dimAttrs) {
          if (dimAttrs.axis) {
            accum[dimAttrs.axis] = dim // collect axis information
          } else if (dimAttrs.cartesian_axis) {
            accum[dimAttrs.cartesian_axis] = dim
          }

          // ensure time is captured if it has a 'calendar' attribute
          if (dimAttrs.calendar && !accum.T) {
            accum.T = dim // set time dimension based on 'calendar' attribute
          }
        }
        return accum
      }, {})

      // construct the base object including time dimension if found
      const base = { variable, ...(axisInfo.T ? { T: axisInfo.T } : {}) }

      // use axis information directly if available and complete
      if (axisInfo.X && axisInfo.Y) {
        return { ...base, X: axisInfo.X, Y: axisInfo.Y }
      }

      // fallback to hardcoded checks if axis info is incomplete
      if (['x', 'y'].every((d) => dims.includes(d))) {
        return { ...base, X: 'x', Y: 'y' }
      } else if (['lat', 'lon'].every((d) => dims.includes(d))) {
        return { ...base, X: 'lon', Y: 'lat' }
      } else if (['latitude', 'longitude'].every((d) => dims.includes(d))) {
        return { ...base, X: 'longitude', Y: 'latitude' }
      } else if (['nlat', 'nlon'].every((d) => dims.includes(d))) {
        return { ...base, X: 'nlon', Y: 'nlat' }
      } else if (!pyramid && ['rlat', 'rlon'].every((d) => dims.includes(d))) {
        // For non-pyramids, also check for rotated X/Y coordinate names
        return { ...base, X: 'rlon', Y: 'rlat' }
      }
    })
    .filter(Boolean)
    .reduce((accum, { variable: v, ...rest }) => {
      accum[v] = rest
      return accum
    }, {})
}

export const getVariables = (metadata, cfAxes, pyramid) => {
  if (!metadata.metadata) {
    throw new Error(metadata?.message || 'Unable to parse metadata')
  }

  const prefix = pyramid ? '0/' : ''

  const multiDimensionalVariables = Object.keys(metadata.metadata)
    .map((k) => k.match(pyramid ? /0\/\w+(?=\/\.zarray)/ : /\w+(?=\/\.zarray)/))
    .filter(Boolean)
    .map((a) => a[0].replace('0/', ''))
    .filter((d) => metadata.metadata[`${prefix}${d}/.zarray`].shape.length >= 2)

  if (multiDimensionalVariables.length === 0) {
    throw new Error('Please provide a dataset with at least 2D data arrays.')
  }

  const variablesWithCoords = multiDimensionalVariables.filter((d) =>
    metadata.metadata[`${prefix}${d}/.zattrs`]['_ARRAY_DIMENSIONS'].every(
      (dim) => metadata.metadata[`${prefix}${dim}/.zarray`]
    )
  )

  if (variablesWithCoords.length === 0) {
    const missingCoordinates = multiDimensionalVariables.reduce((a, d) => {
      metadata.metadata[`${prefix}${d}/.zattrs`]['_ARRAY_DIMENSIONS'].forEach(
        (dim) => {
          if (!metadata.metadata[`${prefix}${dim}/.zarray`]) {
            a.add(dim)
          }
        }
      )
      return a
    }, new Set())
    throw new Error(
      `No viewable variables found. Missing coordinate information for ${
        missingCoordinates.size > 1 ? 'dimensions' : 'dimension'
      }: ${Array.from(missingCoordinates).join(', ')}.`
    )
  }

  const variables = variablesWithCoords.filter((d) => cfAxes[d])

  if (variables.length === 0) {
    throw new Error(
      `No viewable variables found. Unable to infer spatial dimensions for ${
        variablesWithCoords.size > 1 ? 'variables' : 'variable'
      }: ${Array.from(variablesWithCoords)
        .map(
          (v) =>
            `${v} (${metadata.metadata[`${prefix}${v}/.zattrs`][
              '_ARRAY_DIMENSIONS'
            ].join(', ')})`
        )
        .join(', ')}.`
    )
  }

  const levels = Object.keys(metadata.metadata)
    .map((k) => k.match(new RegExp(`[0-9]+(?=\/${variables[0]}\/.zarray)`)))
    .filter(Boolean)
    .map((a) => a[0])

  return { variables, levels }
}
