import { formatDate } from '@carbonplan/components'
import { useDateGetter } from '../date-display'

const DateTickLabel = ({ name, array, index }) => {
  const coord = Number(array[index])
  const getDate = useDateGetter(name)

  if (!getDate) {
    return coord
  }

  const date = getDate(coord)
  const diff = Math.abs(Number(array[1]) - Number(array[0]))

  if (!date) {
    return coord
  }

  if (diff >= 360 && diff <= 366) {
    return formatDate(date.toLocaleDateString(), {
      year: 'numeric',
    })
  } else if (diff >= 28 && diff < 32) {
    return formatDate(date.toLocaleDateString(), {
      month: 'short',
      year: '2-digit',
      separator: "'",
    })
  } else if (diff === 1) {
    return formatDate(date.toLocaleDateString(), {
      month: 'numeric',
      day: 'numeric',
      separator: '/',
    })
  }
}

export default DateTickLabel
