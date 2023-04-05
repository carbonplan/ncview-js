import { Column, Row } from '@carbonplan/components'
import { Box } from 'theme-ui'

const Label = ({ htmlFor, value, children, direction = 'horizontal', sx }) => {
  const singleRow = direction === 'horizontal'
  return (
    <Row columns={[4]}>
      <Column
        start={1}
        width={singleRow ? 1 : 4}
        sx={{
          mb: singleRow ? 0 : 2,
        }}
      >
        <Box
          as='label'
          htmlFor={htmlFor}
          sx={{
            color: 'secondary',
            textTransform: 'uppercase',
            fontFamily: 'mono',
            letterSpacing: 'mono',
            fontSize: 1,
            ...sx,
          }}
        >
          {value}
        </Box>
      </Column>
      <Column start={singleRow ? 2 : 1} width={singleRow ? 3 : 4}>
        {children}
      </Column>
    </Row>
  )
}

export default Label
