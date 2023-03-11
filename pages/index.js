import { Row, Column } from '@carbonplan/components'
import { Sidebar, SidebarDivider } from '@carbonplan/layouts'
import { Box, Container, Flex } from 'theme-ui'
import Dataset from '../components/dataset'
import Display from '../components/display'

import Header from '../components/header'
import Map from '../components/map'
import Selectors from '../components/selectors'

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
            <Sidebar expanded side='left' width={4}>
              <Flex sx={{ flexDirection: 'column', gap: 3 }}>
                <Dataset />
                <Selectors />
              </Flex>
              <SidebarDivider sx={{ my: 4 }} />
              <Display />
            </Sidebar>
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
