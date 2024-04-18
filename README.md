<p align="left" >
<a href='https://carbonplan.org'>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://carbonplan-assets.s3.amazonaws.com/monogram/light-small.png">
  <img alt="CarbonPlan monogram." height="48" src="https://carbonplan-assets.s3.amazonaws.com/monogram/dark-small.png">
</picture>
</a>
</p>

# carbonplan / ncview-js

**interactive tool for visualizing Zarr datasets**

[![CI](https://github.com/carbonplan/ncview-js/actions/workflows/main.yml/badge.svg)](https://github.com/carbonplan/ncview-js/actions/workflows/main.yml)
![GitHub deployments](https://img.shields.io/github/deployments/carbonplan/ncview-js/production?label=vercel)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

This repository contains the prototype for tool to visualize and explore arbitrary cloud-stored Zarr datasets, loosely inspired by [`Ncview`](http://meteora.ucsd.edu/~pierce/ncview_home_page.html). On-the-fly rechunking is performed via a [`Zarr Proxy`](https://github.com/pangeo-data/zarr-proxy) service when multiscale pyramids have not been pregenerated.

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

All the code in this repository is [MIT](https://choosealicense.com/licenses/mit/)-licensed, but we request that you please provide attribution if reusing any of our digital content (graphics, logo, articles, etc.).

## about us

CarbonPlan is a nonprofit organization that uses data and science for climate action. We aim to improve the transparency and scientific integrity of climate solutions with open data and tools. Find out more at [carbonplan.org](https://carbonplan.org/) or get in touch by [opening an issue](https://github.com/carbonplan/ncview-js/issues/new) or [sending us an email](mailto:hello@carbonplan.org).
