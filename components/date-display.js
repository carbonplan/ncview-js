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
      if (calendar !== 'proleptic_gregorian') {
        throw new Error(`Unexpected calendar: ${calendar}`)
      }

      const startDate = units.match(/(?<=days since ).+/)
      if (!startDate) {
        throw new Error(
          `No date found in: ${units}. Expected 'dates since [DATE STRING]' format.`
        )
      }

      const date = new Date(startDate)
      date.setDate(date.getDate() + v)

      return formatDate(date.toLocaleDateString())
    },
    [units, calendar]
  )

  return formatter(index + chunk * chunkShape)
}

export default DateDisplay
