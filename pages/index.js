import { Row, Column } from '@carbonplan/components'
import { Sidebar, SidebarDivider } from '@carbonplan/layouts'
import { Box, Container, Flex } from 'theme-ui'
import Dataset from '../components/dataset'
import Display from '../components/display'

import Header from '../components/header'
import LoadingStates from '../components/loading-states'
import Map from '../components/map'
import Plots from '../components/plots'
import Selectors from '../components/selectors'
import Notice from '../components/notice'

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
            <Sidebar expanded side='left' width={4} footer={<Plots />}>
              <Notice />
              <SidebarDivider sx={{ my: 4 }} />

              <Flex sx={{ flexDirection: 'column', gap: 3 }}>
                <Dataset />
                <Selectors />
              </Flex>
              <SidebarDivider sx={{ my: 4 }} />
              <Display />
            </Sidebar>
            <LoadingStates />
            <Column start={[5]} width={[8]}>
              <Map />
            </Column>
          </Row>
        </Container>
      </Box>
    </>
  )
}

export default Index
