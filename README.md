# fcp-site

Product and landing page of FCP, the open-source front-camera perception and
ADAS stack. It runs at https://fcp.famashines.com. The site is static files,
served by nginx.

```
figure/build.mjs ──> public/assets/bench.js, bench.css   (the hero test bench)
public/          ──> the site: index.html, styles.css, assets, icons
brand/og.html    ──> public/og.png                       (social image, made by hand)
```

## Work on it

    node figure/build.mjs                         # build the bench figure
    python3 -m http.server 8137 -d public         # http://localhost:8137

The figure uses `figure/iso-kit.mjs`, a copy of the iso kit of the Anatomy
skill (MIT, see `figure/LICENSE-iso-kit`). The font is Overpass (SIL OFL, see
`public/assets/fonts/OFL.txt`).

## Brand

- `public/assets/brand/fcp-mark.svg` is the brand mark: a road seen through a
  fisheye lens, with the amber CIPV.
- `public/favicon.svg` is the same mark on an ink tile.
- `public/apple-touch-icon.png` (180 x 180) is the favicon, rendered full bleed.
- `public/og.png` (1200 x 630) is `brand/og.html`, rendered with reduced motion.

To render the PNG files again, serve the repo root and take a screenshot of
`brand/og.html` at 1200 x 630 and of `public/favicon.svg` at 180 x 180 in a
browser.

## Design

- Concrete `#E3E6E8` (page), ink `#1B2430` (text), asphalt `#2A3038` (the
  Studio band), marking amber `#F2B705` (what applies to us: the CIPV),
  signal red `#D33A2C` (the collision warning only), rule grey `#8A939B`.
- One typeface: Overpass, from the road-sign typeface Highway Gothic, with
  tabular figures.
- The one strong element is the test bench in the hero.

## Release

Each pull request builds the image once as a check. A merge to `main` builds
`ghcr.io/famashines/fcp-site:sha-<commit>` and opens and merges a release pull
request in `famashines/gitops`. ArgoCD then deploys it to the namespace
`fcp-prod`. The workflow needs the repository secret `GITOPS_TOKEN`.
