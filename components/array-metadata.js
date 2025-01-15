import { Column, Row } from '@carbonplan/components'
import { Box, Divider } from 'theme-ui'

import useStore from './data/store'

const ArrayMetadata = ({ array }) => {
  const zattrs = useStore((state) => state.dataset?.getZattrs(array) ?? {})
  const keys = Object.keys(zattrs)
  const rows =
    keys.length === 0
      ? [['Metadata', 'Missing coordinate array and attributes']]
      : keys.map((key, i) => {
          const value = Array.isArray(zattrs[key])
            ? `[${zattrs[key].join(', ')}]`
            : zattrs[key]
          return [key, value]
        })
  return (
    <Box>
      {rows.map(([key, value], i) => {
        return (
          <Row
            key={key}
            columns={4}
            sx={{
              color: 'primary',
              fontSize: [1, 1, 1, 2],
              fontFamily: 'mono',
              letterSpacing: 'mono',
            }}
          >
            <Column start={1} width={4}>
              <Divider sx={{ width: '100%' }} />
            </Column>

            <Column
              start={1}
              width={2}
              sx={{ color: 'secondary', wordBreak: 'break-all' }}
            >
              {key}
            </Column>
            <Column
              start={3}
              width={2}
              sx={{
                wordBreak: String(value).includes(' ')
                  ? 'break-word'
                  : 'break-all',
              }}
            >
              {value}
            </Column>
            {i === rows.length - 1 ? (
              <Column start={1} width={4}>
                <Divider sx={{ width: '100%' }} />
              </Column>
            ) : null}
          </Row>
        )
      })}
    </Box>
  )
}

export default ArrayMetadata
