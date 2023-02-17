import { Column, Row } from '@carbonplan/components'
import { Box, Divider } from 'theme-ui'

import useStore from './store'

const ArrayMetadata = ({ array }) => {
  const metadata = useStore((state) => state.metadata)
  const zattrs = metadata.metadata[`${array}/.zattrs`]
  const keys = Object.keys(zattrs)

  return (
    <Box>
      {Object.keys(zattrs).map((key, i) => {
        const value = Array.isArray(zattrs[key])
          ? `[${zattrs[key].join(', ')}]`
          : zattrs[key]

        return (
          <Row
            key={key}
            columns={3}
            sx={{
              color: 'primary',
              fontSize: [1, 1, 1, 2],
              fontFamily: 'mono',
              letterSpacing: 'mono',
            }}
          >
            <Column start={1} width={3}>
              <Divider sx={{ width: '100%' }} />
            </Column>

            <Column
              start={1}
              width={1}
              sx={{ color: 'secondary', wordBreak: 'break-all' }}
            >
              {key}
            </Column>
            <Column
              start={2}
              width={2}
              sx={{
                wordBreak: String(value).includes(' ')
                  ? 'break-word'
                  : 'break-all',
              }}
            >
              {value}
            </Column>
            {i === keys.length - 1 ? (
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

export default ArrayMetadata
