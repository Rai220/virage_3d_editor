# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Virage 3D Editor is a browser-based 3D modeling tool for children, built with vanilla JS + Three.js (loaded via CDN import maps). There is no build system — the project is a static site served directly from the repo root.

### Running the dev server

```bash
npx serve . -p 3000 -s
```

Open `http://localhost:3000/` in Chrome. ES modules require an HTTP server — `file://` protocol will not work.

### Linting

```bash
npm run lint
```

Uses ESLint flat config (`eslint.config.js`) targeting `js/**/*.js`. The project uses ES2020 module syntax.

### Tests

No automated test framework is configured yet. Run `npm test` (currently a placeholder).

### Key caveats

- All Three.js and three-bvh-csg dependencies load from `cdn.jsdelivr.net` at runtime in the browser. There are no npm runtime dependencies — only dev dependencies (`eslint`, `serve`).
- The UI language is Russian. All toolbar labels, status messages, and property panel text are in Russian.
- The project uses `type: "module"` in `package.json` and ES module `import`/`export` syntax throughout.
