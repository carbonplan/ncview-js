import { Row, Column } from '@carbonplan/components'
import { Box, Container, Divider, Flex } from 'theme-ui'
import Dataset from '../components/dataset'
import Display from '../components/display'

import Header from '../components/header'
import Map from '../components/map'

const Index = () => {
  return (
    <>
      <Header />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '100%',
          left: 0,
          overflow: 'clip',
        }}
      >
        <Container>
          <Row>
            <Column
              start={1}
              width={4}
              sx={{
                mx: [-4, -5, -5, -6],
                px: [4, 5, 5, 6],
                borderColor: 'muted',
                borderWidth: 0,
                borderRightWidth: 1,
                borderStyle: 'solid',
                height: '100vh',
                pb: 4,
              }}
            >
              <Flex
                sx={{
                  height: '100%',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Divider sx={{ mt: '56px', mx: [-4, -5, -5, -6], mb: 4 }} />
                  <Dataset />
                </Box>
                <Display />
              </Flex>
            </Column>
            <Column start={[5]} width={[8]} sx={{ mt: '56px' }}>
              <Map />
            </Column>
          </Row>
        </Container>
      </Box>
    </>
  )
}

export default Index
