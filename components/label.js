import { Column, Row } from '@carbonplan/components'
import { Box } from 'theme-ui'

const Label = ({ htmlFor, value, children, direction = 'horizontal' }) => {
  const singleRow = direction === 'horizontal'
  return (
    <Row columns={[3]}>
      <Column
        start={1}
        width={singleRow ? 1 : 3}
        sx={{
          mb: singleRow ? 0 : 2,
        }}
      >
        <Box
          as='label'
          htmlFor={htmlFor}
          sx={{ color: 'secondary', textTransform: 'uppercase' }}
        >
          {value}
        </Box>
      </Column>
      <Column start={singleRow ? 2 : 1} width={singleRow ? 2 : 3}>
        {children}
      </Column>
    </Row>
  )
}

export default Label
