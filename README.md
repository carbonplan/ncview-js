<img
  src='https://carbonplan-assets.s3.amazonaws.com/monogram/dark-small.png'
  height='48'
/>

# carbonplan / article template

**template repository for carbonplan articles**

[![GitHub][github-badge]][github]
[![Build Status]][actions]
![MIT License][]

[github]: https://github.com/carbonplan/article-template
[github-badge]: https://badgen.net/badge/-/github?icon=github&label
[build status]: https://github.com/carbonplan/article-template/actions/workflows/main.yml/badge.svg
[actions]: https://github.com/carbonplan/article-template/actions/workflows/main.yaml
[mit license]: https://badgen.net/badge/license/MIT/blue

This repository contains a template for developing an article to be included on our research site at [carbonplan.org/research](https://carbonplan.org/research).

This is basically a mini [Next.js](https://nextjs.org/) app that wraps your article content with our layout for development purposes.

To start working on a new article click the [Use this template](https://github.com/carbonplan/article-template/generate) button, or clone this repo. You'll want to do all writing and development in the top-level `article` folder, which should include an `index.md` file for primary markdown content and a `components` folder for custom React components that you can import inside `index.md`. You should also update `contents.js` with the metadata for your article, like `authors` and `tags`. You shouldn't need to touch anything else.

When an article is finished, we publish it by copying the contents of the `article` folder into a folder named with the article `id` in the `articles` folder in our the main [research](https://github.org/carbonplan/research) site. We also update the index listing. That's it!

## to build the site locally

Assuming you already have `Node.js` installed, you can install the build dependencies as:

```shell
npm install .
```

To start a development version of the site, simply run:

```shell
npm run dev
```

and then visit `http://localhost:5001` in your browser.

## license

All the code in this repository is [MIT](https://choosealicense.com/licenses/mit/) licensed, but we request that you please provide attribution if reusing any of our digital content (graphics, logo, articles, etc.).

## about us

CarbonPlan is a non-profit organization working on the science and data of carbon removal. We aim to improve the transparency and scientific integrity of carbon removal and climate solutions through open data and tools. Find out more at [carbonplan.org](https://carbonplan.org/) or get in touch by [opening an issue](https://github.com/carbonplan/research/issues/new) or [sending us an email](mailto:hello@carbonplan.org).
