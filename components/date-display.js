import { formatDate } from '@carbonplan/components'
import { useCallback } from 'react'
import useStore from './store'

export const useDateFormatter = (coordinate, options) => {
  const pyramid = useStore((state) => state.dataset?.pyramid)
  const { units, calendar } = useStore(
    (state) =>
      state.dataset?.metadata.metadata[
        `${pyramid ? '0/' : ''}${coordinate}/.zattrs`
      ]
  )

  if (!units) {
    return
  }
  if (calendar !== 'proleptic_gregorian') {
    console.warn(`Unhandled calendar: ${calendar}`)
    return
  }

  const startDate = units.match(/(?<=days since ).+/)
  if (!startDate) {
    console.warn(
      `No date found in: ${units}. Expected 'days since [DATE STRING]' format.`
    )
    return
  }

  const formatter = useCallback(
    (v) => {
      let dateString = startDate[0]
      // append time to use local time zone if time is not already present
      if (!dateString.match(/\d\d:\d\d/)) {
        dateString = `${dateString} 12:00`
      }

      const date = new Date(dateString)
      date.setDate(date.getDate() + v)

      return formatDate(date.toLocaleDateString(), options)
    },
    [startDate, options]
  )

  return formatter
}

const DateDisplay = ({ array, selector, chunkShape }) => {
  const { index, chunk } = selector

  const formatter = useDateFormatter(selector.name)
  if (!formatter) {
    return null
  }
  return formatter(Number(array.data[index + chunk * chunkShape]))
}

export default DateDisplay
