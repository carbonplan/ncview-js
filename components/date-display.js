import { formatDate } from '@carbonplan/components'
import { useCallback } from 'react'
import useStore from './data/store'

export const useDateGetter = (coordinate) => {
  const { units, calendar } = useStore(
    (state) => state.dataset?.getZattrs(coordinate) ?? {}
  )

  if (!units) {
    return
  }
  if (!['standard', 'proleptic_gregorian'].includes(calendar)) {
    console.warn(`Unhandled calendar: ${calendar}`)
    return
  }

  const startDate = units
    .match(/days since .+/)
    ?.map((d) => d.replace('days since ', ''))
  if (!startDate) {
    console.warn(
      `No date found in: ${units}. Expected 'days since [DATE STRING]' format.`
    )
    return
  }

  const getter = useCallback(
    (v) => {
      let dateString = startDate[0]
      // append time to use local time zone if time is not already present
      if (!dateString.match(/\d\d:\d\d/)) {
        dateString = `${dateString} 12:00`
      }

      const date = new Date(dateString)
      date.setDate(date.getDate() + v)

      return date
    },
    [startDate]
  )

  return getter
}

const DateDisplay = ({ array, selector, chunkShape }) => {
  const { index, chunk } = selector
  const getter = useDateGetter(selector.name)

  if (!getter) {
    return null
  }

  return formatDate(
    getter(Number(array.data[index + chunk * chunkShape])).toLocaleDateString()
  )
}

export default DateDisplay
