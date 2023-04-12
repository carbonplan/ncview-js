import { SidebarAttachment } from '@carbonplan/layouts'
import { Box, Spinner } from 'theme-ui'
import useStore from './data/store'

const LoadingStates = () => {
  const loading = useStore((state) => state.getLoading())
  const scrubbing = useStore((state) => state.scrubbing)

  return (
    <>
      <SidebarAttachment
        expanded
        side='left'
        width={4}
        sx={{
          top: '16px',
          width: '24px',
        }}
      >
        <Spinner
          duration={750}
          size={32}
          sx={{
            opacity: loading && !scrubbing ? 1 : 0,
            transition: 'opacity 0.05s',
          }}
        />
      </SidebarAttachment>

      <SidebarAttachment
        expanded
        side='left'
        width={4}
        sx={{
          top: '22px',
          opacity: scrubbing ? 0.5 : 0,
          transition: 'opacity 0.15s',
          fontFamily: 'mono',
          letterSpacing: 'mono',
          textTransform: 'uppercase',
          fontSize: [1, 1, 1, 2],
        }}
      >
        Release to update
      </SidebarAttachment>

      <Box
        sx={{
          position: 'absolute',
          pointerEvents: 'none',
          width: '100%',
          left: '0px',
          top: '0px',
          height: 'calc(100vh)',
          opacity: scrubbing ? 0.5 : 0,
          transition: 'opacity 0.15s',
          bg: 'background',
          zIndex: 500,
        }}
      />
    </>
  )
}

export default LoadingStates
