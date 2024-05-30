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
      `Unable to render formatted date coordinates. No date found in: ${units}; expected 'days since [DATE STRING]' format.`
    )
    return
  }

  const getter = useCallback(
    (v) => {
      // Remove time and trim whitespace for simplest initialization across browsers
      const dateString = startDate[0].replace(/\d\d(:\d\d)+/, '').trim()

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
