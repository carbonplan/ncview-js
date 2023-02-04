import { Box } from 'theme-ui'

const Back = (props) => {
  return (
    <Box
      as='svg'
      viewBox='0 0 15 15'
      xmlns='http://www.w3.org/2000/svg'
      fill='currentColor'
      stroke='currentColor'
      {...props}
    >
      <path d='M4 7.5L15 15L15 0L4 7.5Z' />
      <line x1='1' y1='15' x2='1' y2='-4.37115e-08' stroke-width='2' />
    </Box>
  )
}

export default Back
