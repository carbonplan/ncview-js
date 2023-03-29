import { formatDate } from '@carbonplan/components'
import { useCallback } from 'react'
import useStore from './store'

const DateDisplay = ({ selector, chunkShape }) => {
  const { name, index, chunk } = selector
  const { units, calendar } = useStore(
    (state) => state.metadata.metadata[`${name}/.zattrs`]
  )

  const formatter = useCallback(
    (v) => {
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

      let dateString = startDate[0]
      // append time to use local time zone if time is not already present
      if (!dateString.match(/\d\d:\d\d/)) {
        dateString = `${dateString} 12:00`
      }

      const date = new Date(dateString)
      date.setDate(date.getDate() + v)

      return formatDate(date.toLocaleDateString())
    },
    [units, calendar]
  )

  return formatter(index + chunk * chunkShape)
}

export default DateDisplay
