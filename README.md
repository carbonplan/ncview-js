<img
  src='https://carbonplan-assets.s3.amazonaws.com/monogram/dark-small.png'
  height='48'
/>

# carbonplan / ncview-js

**interactive tool for visualizing Zarr datasets**

[![GitHub][github-badge]][github]
[![Build Status]][actions]
![MIT License][]

[github]: https://github.com/carbonplan/ncview-js
[github-badge]: https://badgen.net/badge/-/github?icon=github&label
[build status]: https://github.com/carbonplan/ncview-js/actions/workflows/main.yml/badge.svg
[actions]: https://github.com/carbonplan/ncview-js/actions/workflows/main.yaml
[mit license]: https://badgen.net/badge/license/MIT/blue

This repository contains the prototype for tool to visualize and explore arbitrary cloud-stored Zarr datasets, loosely inspired by [`Ncview`](http://meteora.ucsd.edu/~pierce/ncview_home_page.html). Pre-processing is performed via a rechunking service ([code](https://github.com/carbonplan/ncviewjs-backend), [docs](https://ncview-backend.fly.dev/docs)).

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

CarbonPlan is a non-profit organization that uses data and science for climate action. We aim to improve the transparency and scientific integrity of climate solutions with open data and tools. Find out more at [carbonplan.org](https://carbonplan.org/) or get in touch by [opening an issue](https://github.com/carbonplan/ncview-js/issues/new) or [sending us an email](mailto:hello@carbonplan.org).
