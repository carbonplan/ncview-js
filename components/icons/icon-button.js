import { IconButton } from 'theme-ui'

const IconButtonWrapper = (props) => {
  return (
    <IconButton
      {...props}
      sx={{
        color: props.disabled ? 'muted' : 'primary',
        transition: '0.2s color',
        padding: 0,
        cursor: props.disabled ? 'default' : 'pointer',
        padding: 0,
        '&:hover': {
          color: props.disabled ? 'muted' : 'secondary',
        },
        ...props.sx,
      }}
    />
  )
}

export default IconButtonWrapper
