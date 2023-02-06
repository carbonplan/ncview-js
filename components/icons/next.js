import { Box } from 'theme-ui'

const Next = (props) => {
  return (
    <Box
      as='svg'
      viewBox='0 0 15 15'
      xmlns='http://www.w3.org/2000/svg'
      fill='currentColor'
      stroke='currentColor'
      {...props}
    >
      <path d='M11 7.5L0 0V15L11 7.5Z' />
      <line x1='14' y1='4.37115e-08' x2='14' y2='15' strokeWidth='2' />
    </Box>
  )
}

export default Next
