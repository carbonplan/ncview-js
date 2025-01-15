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
    // Do not show URL for details because request is ultimately proxied via /api/metadata route.
    throw new Error(
      'A network error occurred while fetching metadata. This could be a CORS issue, a dropped internet connection, or another network problem.'
    )
  }

  if (!response.ok) {
    const statusText = response.statusText ?? 'Dataset request failed.'
    const errorMessage = generateErrorMessage(
      response.status,
      statusText,
      sanitized
    )
    throw new Error(errorMessage)
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

const generateErrorMessage = (status, statusText, sanitizedUrl) => {
  switch (status) {
    case 403:
      return `STATUS 403: Access forbidden. Ensure that URL is correct and that dataset is publicly accessible.`
    case 404:
      return `STATUS 404: ${statusText}. Ensure that URL path is correct.`
    case 500:
    case 502:
    case 503:
      return `STATUS ${status}: ${statusText}. The server encountered an error. Please try again later.`
    default:
      return `STATUS ${status}: ${statusText}. URL: ${sanitizedUrl}`
  }
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

  let variables
  const multiDimensionalVariables = Object.keys(metadata.metadata)
    .map((k) => k.match(pyramid ? /0\/\w+(?=\/\.zarray)/ : /\w+(?=\/\.zarray)/))
    .filter(Boolean)
    .map((a) => a[0].replace('0/', ''))
    .filter((d) => metadata.metadata[`${prefix}${d}/.zarray`].shape.length >= 2)

  if (multiDimensionalVariables.length === 0) {
    throw new Error('Please provide a dataset with at least 2D data arrays.')
  }
  variables = multiDimensionalVariables

  const variablesWithCfAxes = variables.filter((d) => cfAxes[d])
  if (variablesWithCfAxes.length === 0) {
    throw new Error(
      `No viewable variables found. Unable to infer spatial dimensions for ${
        variables.size > 1 ? 'variables' : 'variable'
      }: ${Array.from(variables)
        .map(
          (v) =>
            `${v} (${metadata.metadata[`${prefix}${v}/.zattrs`][
              '_ARRAY_DIMENSIONS'
            ].join(', ')})`
        )
        .join(', ')}.`
    )
  }
  variables = variablesWithCfAxes

  if (pyramid) {
    // @carbonplan/maps requires all dimensions to have coordinate arrays
    const variablesWithCoords = variables.filter((d) =>
      metadata.metadata[`${prefix}${d}/.zattrs`]['_ARRAY_DIMENSIONS'].every(
        (dim) => metadata.metadata[`${prefix}${dim}/.zarray`]
      )
    )

    if (variablesWithCoords.length === 0) {
      const missingCoordinates = variables.reduce((a, d) => {
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
    variables = variablesWithCoords
  } else {
    // proxy map rendering requires access to spatial coordinates
    const variablesWithSpatialCoords = variables.filter((d) =>
      [cfAxes[d].X, cfAxes[d].Y].every(
        (dim) => metadata.metadata[`${prefix}${dim}/.zarray`]
      )
    )

    if (variablesWithSpatialCoords.length === 0) {
      const missingCoordinates = variables.reduce((a, d) => {
        ;[cfAxes[d].X, cfAxes[d].Y].forEach((dim) => {
          if (!metadata.metadata[`${prefix}${dim}/.zarray`]) {
            a.add(dim)
          }
        })
        return a
      }, new Set())
      throw new Error(
        `No viewable variables found. Missing coordinate information for spatial ${
          missingCoordinates.size > 1 ? 'dimensions' : 'dimension'
        }: ${Array.from(missingCoordinates).join(', ')}.`
      )
    }
    variables = variablesWithSpatialCoords
  }

  const levels = Object.keys(metadata.metadata)
    .map((k) => k.match(new RegExp(`[0-9]+(?=\/${variables[0]}\/.zarray)`)))
    .filter(Boolean)
    .map((a) => a[0])

  return { variables, levels }
}
