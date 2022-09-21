import { Tool } from '@carbonplan/layouts'

const Index = () => {
  const meta = {
    id: 'tool-title',
    title: 'Tool title',
    color: 'blue',
    summary: 'Summary of tool.',
  }

  return (
    <Tool meta={meta} description='Description of the tool'>
      This is a tool.
    </Tool>
  )
}

export default Index
