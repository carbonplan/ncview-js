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
          borderWidth: 0,
          borderStyle: ['solid', 'solid', 'none', 'none'],
          borderColor: ['muted', 'muted', 'unset', 'unset'],
          borderBottomWidth: ['1px', '1px', 'unset', 'unset'],
          bg: ['background', 'background', 'unset', 'unset'],
          position: 'sticky',
          top: 0,
          height: '56px',
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
