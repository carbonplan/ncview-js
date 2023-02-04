import { IconButton } from 'theme-ui'

const IconButtonWrapper = (props) => {
  return (
    <IconButton
      {...props}
      sx={{
        color: props.disabled ? 'secondary' : 'primary',
        transition: '0.2s color',
        padding: 0,
        cursor: props.disabled ? 'default' : 'pointer',
        padding: 0,
        ...props.sx,
      }}
    />
  )
}

export default IconButtonWrapper
