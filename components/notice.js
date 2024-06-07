import { Box } from 'theme-ui'
import { Link } from '@carbonplan/components'

const Notice = () => {
  return (
    <Box
      sx={{
        color: 'secondary',
        fontSize: [1],
      }}
    >
      <Box sx={{ pointerEvents: 'none' }}>
        This is an experimental tool for exploring data. Learn more on{' '}
        <Link
          sx={{ color: 'secondary' }}
          href='https://github.com/carbonplan/ncview-js'
        >
          GitHub
        </Link>
        .
      </Box>
    </Box>
  )
}

export default Notice
