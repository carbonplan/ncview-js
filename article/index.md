import { Article, Endnote, PullQuote } from '@carbonplan/layouts'

import Component from './components/component'

export const meta = {
  id: 'article-title',
  date: '05-16-2021',
  title: 'Article title',
  authors: ['Author 1', 'Author 2'],
  color: 'blue',
  summary: 'Summary of article.',
  quotes: [],
}

This is markdown

<Component></Component>

<Endnote label='Credits' divider>

[Who did what]

Please cite as:

[How to cite]

</Endnote>

<Endnote label='Terms'>

[Funding, involvement, etc.]

</Endnote>

export default ({ children }) => <Article meta={meta}>{children}</Article>
