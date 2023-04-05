import { Box, Container } from 'theme-ui'
import {
  Meta,
  Guide,
  Dimmer,
  Header as HeaderComponent,
} from '@carbonplan/components'

const Header = () => {
  return (
    <>
      <Meta card={'TK'} description={'TK'} title={'Data Viewer – CarbonPlan'} />

      <Container>
        <Guide color='teal' />
      </Container>

      <Box
        sx={{
          position: 'absolute',
          top: 0,
          width: '100%',
          position: 'sticky',
          top: 0,
          zIndex: 5000,
        }}
      >
        <Container>
          <HeaderComponent
            menuItems={[
              <Dimmer key='dimmer' sx={{ mt: '-2px', color: 'primary' }} />,
            ]}
          />
        </Container>
      </Box>
    </>
  )
}

export default Header
