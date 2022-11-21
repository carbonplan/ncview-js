import { Colors, Column, Row } from '@carbonplan/components'
import { Box } from 'theme-ui'

import useStore from './store'

const VariableMetadata = () => {
  const variables = useStore((state) => state.variables)
  const metadata = useStore((state) => state.metadata)

  console.log()
  return (
    <Box>
      {variables.map((variable) => {
        const zarray = metadata.metadata[`${variable}/.zarray`]
        const zattrs = metadata.metadata[`${variable}/.zattrs`]
        const coords = zattrs['_ARRAY_DIMENSIONS']

        return (
          <Row
            key={variable}
            columns={3}
            sx={{
              color: 'primary',
              fontSize: [2, 2, 2, 3],
              fontFamily: 'mono',
              letterSpacing: 'mono',
            }}
          >
            <Column start={1} width={1}>
              {variable}
            </Column>
            <Column start={2} width={2}>
              (
              {coords.map((c, i) => (
                <span key={c}>
                  {c}: <Colors.Secondary>{zarray.shape[i]}</Colors.Secondary>
                  {i < coords.length - 1 ? ', ' : ''}
                </span>
              ))}
              )
            </Column>
          </Row>
        )
      })}
    </Box>
  )
}

export default VariableMetadata
