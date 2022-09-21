import { Layout } from '@carbonplan/components'

import Map from '../components/map'

const Index = () => {
  const meta = {
    id: 'tool-title',
    title: 'Tool title',
    color: 'blue',
  }

  return (
    <Layout title={'Data Viewer – CarbonPlan'} description={'TK'}>
      <Map />
    </Layout>
  )
}

export default Index
