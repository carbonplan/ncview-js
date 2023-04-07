import { SidebarAttachment } from '@carbonplan/layouts'
import { Spinner } from 'theme-ui'
import useStore from './store'

const LoadingStates = () => {
  const loading = useStore((state) => state.loading)

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
          sx={{ opacity: loading ? 1 : 0, transition: 'opacity 0.05s' }}
        />
      </SidebarAttachment>
    </>
  )
}

export default LoadingStates
