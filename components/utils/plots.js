import unpack from 'ndarray-unpack'
import { isNullValue, inLonRange, toKeyArray, getLonDiff } from './data'

const radians = (deg) => (deg * Math.PI) / 180
const degrees = (rad) => (rad * 180) / Math.PI

// TODO: weight by coords

const areaOfPixelProjected = (lat, zoom) => {
  const c = 40075016.686 / 1000
  return Math.pow(
    (c * Math.cos(radians(lat))) / Math.pow(2, Math.floor(zoom) + 7),
    2
  )
}

export const average = (arr, { variable, coordinates, zoom }) => {
  const areas = coordinates.lat
    .filter((l, i) => !isNullValue(arr[i], variable))
    .map((lat) => areaOfPixelProjected(lat, zoom))
  const totalArea = areas.reduce((a, d) => a + d, 0)

  return arr
    .filter((el) => !isNullValue(el, variable))
    .reduce((avg, el, i) => avg + el * (areas[i] / totalArea), 0)
}

export const getPlotSelector = (selectors, chunk_shape) => {
  return selectors
    .filter(
      (selector) =>
        typeof selector.chunk === 'number' && typeof selector.index === 'number'
    )
    .reduce(
      (maxSoFar, selector) => {
        const chunkSize = chunk_shape[selector.metadata.dimensionIndex]
        if (!maxSoFar.selector || maxSoFar.chunkSize <= chunkSize) {
          return { selector, chunkSize }
        } else {
          return maxSoFar
        }
      },
      { selector: null, chunkSize: 0 }
    ).selector
}

// START: helpers to handle querying lines for rotated datasets

// TODO: debug issues with rotation
const rotate = (coords, phi, theta) => {
  const lon = radians(coords[0])
  const lat = radians(coords[1])

  // Convert from spherical to cartesian coordinates
  const unrotatedCoord = [
    Math.cos(lon) * Math.cos(lat),
    Math.sin(lon) * Math.cos(lat),
    Math.sin(lat),
  ]

  // From https://en.wikipedia.org/wiki/Rotation_matrix#General_rotations
  const intrinsicRotation = [
    [
      Math.cos(phi) * Math.cos(theta),
      -1 * Math.sin(phi),
      Math.cos(phi) * Math.sin(theta),
    ],
    [
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    ],
    [-1.0 * Math.sin(theta), 0, Math.cos(theta)],
  ]

  const rotatedCoord = [
    intrinsicRotation[0][0] * unrotatedCoord[0] +
      intrinsicRotation[0][1] * unrotatedCoord[1] +
      intrinsicRotation[0][2] * unrotatedCoord[2],
    intrinsicRotation[1][0] * unrotatedCoord[0] +
      intrinsicRotation[1][1] * unrotatedCoord[1] +
      intrinsicRotation[1][2] * unrotatedCoord[2],
    intrinsicRotation[2][0] * unrotatedCoord[0] +
      intrinsicRotation[2][1] * unrotatedCoord[1] +
      intrinsicRotation[2][2] * unrotatedCoord[2],
  ]

  // Convert from cartesian to spherical coordinates
  const rotatedLon = degrees(Math.atan2(rotatedCoord[1], rotatedCoord[0]))
  const rotatedLat = degrees(Math.asin(rotatedCoord[2]))

  return [rotatedLon, rotatedLat]
}

const rotateCoords = (coords, northPole) => {
  const phiOffset = northPole[1] == 90 ? 0 : 180
  const phi = radians(phiOffset + northPole[0])
  const theta = radians(-1 * (90 - northPole[1]))

  return rotate(coords, phi, theta)
}

const unrotateCoords = (coords, northPole) => {
  const phiOffset = northPole[1] == 90 ? 0 : 180
  const phi = -1 * radians(phiOffset + northPole[0])
  const theta = -1 * radians(-1 * (90 - northPole[1]))

  return rotate(coords, phi, theta)
}

const inBounds = (point, bounds) => {
  const [lon, lat] = point

  return (
    inLonRange(lon, bounds.lon) && bounds.lat[0] <= lat && bounds.lat[1] >= lat
  )
}

// END: helpers to handle querying lines for rotated datasets

// TODO: avoid returning data when chunk is not yet present in `chunks`
// TODO: handle circular areas
//       - handle non-equal area pixels in aggregation
export const getLines = (
  center,
  selector,
  { activeChunkKeys, chunks, variable, selectors }
) => {
  const { chunk_separator, axes, chunk_shape, northPole } = variable
  const result = { coords: [], points: [], range: [Infinity, -Infinity] }

  const unrotatedCenter = northPole ? unrotateCoords(center, northPole) : center
  const selectedChunks = activeChunkKeys.filter(
    (c) => chunks[c] && inBounds(unrotatedCenter, chunks[c].bounds)
  )

  selectedChunks.forEach((chunkKey) => {
    const chunkKeyArray = toKeyArray(chunkKey, { chunk_separator })
    const { clim, bounds, data } = chunks[chunkKey]
    result.range = [
      Math.min(result.range[0], clim[0]),
      Math.max(result.range[1], clim[1]),
    ]

    const spatialIndices = [
      {
        axis: axes.X,
        diff: getLonDiff(unrotatedCenter[0], bounds.lon),
      },
      {
        axis: axes.Y,
        diff: unrotatedCenter[1] - bounds.lat[0],
      },
    ].map(({ axis, diff }) => {
      const { step } = axis

      return Math.round(diff / step - 1 / 2)
    })

    const indices = selectors.map((s, i) => {
      if (s.name === selector.name) {
        // return all values for selector being plotted
        return null
      } else if (i === axes.X.index) {
        // return selected index for X dimensions
        return spatialIndices[0]
      } else if (i === axes.Y.index) {
        // return selected index for Y dimension
        return spatialIndices[1]
      } else {
        // return displayed index for all other dimensions
        return selectors[i].index
      }
    })

    const values = indices.every((i) => typeof i === 'number')
      ? data.get(...indices)
      : unpack(data.pick(...indices))
    result.points.push(values)

    let coords = [
      axes.X.array.data[
        chunk_shape[axes.X.index] * chunkKeyArray[axes.X.index] +
          spatialIndices[0]
      ],
      axes.Y.array.data[
        chunk_shape[axes.Y.index] * chunkKeyArray[axes.Y.index] +
          spatialIndices[1]
      ],
    ]
    coords = northPole ? rotateCoords(coords, northPole) : coords

    result.coords.push(coords)
  })
  return result
}
