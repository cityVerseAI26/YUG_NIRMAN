# YUG NIRMAN | AI Future City Simulator

## GitHub Pages deployment

The site deploys automatically when changes are pushed to the `main` branch.
The workflow builds the Vite app with the repository-specific base path and
publishes the output from `dist/`.

To enable deployment, open **Settings → Pages** in the GitHub repository and
set **Build and deployment → Source** to **GitHub Actions**. The first workflow
run will publish the site; subsequent pushes to `main` update it automatically.

Client-side routes are served through the included `404.html` fallback.

## Local development

```sh
npm ci
npm run dev
```

To build and preview the production bundle locally:

```sh
npm run build
npm run preview
```
