# MediaSlide browser demo

This harness imports the real `src/MediaSlide.js` implementation, with four checked-in SVG fixtures. It requires no network requests at runtime. The package lock remains unchanged: demo tooling is installed separately and is not shipped with the library.

```sh
npm ci
npm install --no-save --package-lock=false vite@5 react-dom@18 @playwright/test@1.56
npx playwright install chromium
npx vite --config demo/vite.config.mjs
```

Visit http://127.0.0.1:4173. To run browser tests, use `npx playwright test`. Screenshots from real Chromium sessions are written to `test-results/screenshots` and uploaded as GitHub Actions artifacts. The screenshots are evidence captures, not approved pixel-perfect golden baselines; review the captures before introducing stable snapshot baselines. The browser suite checks modes, selection, forward/backward paging, custom renderers and mobile layout. The separate page controls make pagination deterministic independently of IntersectionObserver timing.

## Published demonstration

After a successful `main` branch browser-test run, GitHub Actions builds and deploys the demo to [GitHub Pages](https://kieransimkin.github.io/react-mediaslide/). The workflow publishes the actual Vite build using the repository-relative base path, including bundled media. Pull requests test the demo but do not deploy it.

In the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
