import { Colors, Column, Row } from '@carbonplan/components'
import { Box, Divider } from 'theme-ui'

import useStore from './store'

const VariableMetadata = () => {
  const variables = useStore((state) => state.variables)
  const metadata = useStore((state) => state.metadata)

  return (
    <Box>
      {variables.map((variable, i) => {
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
              {coords.map((c, j) => (
                <span key={c}>
                  {c}: <Colors.Secondary>{zarray.shape[j]}</Colors.Secondary>
                  {j < coords.length - 1 ? ', ' : ''}
                </span>
              ))}
              )
            </Column>
            {i < variables.length - 1 ? (
              <Column start={1} width={3}>
                <Divider sx={{ width: '100%' }} />
              </Column>
            ) : null}
          </Row>
        )
      })}
    </Box>
  )
}

export default VariableMetadata
