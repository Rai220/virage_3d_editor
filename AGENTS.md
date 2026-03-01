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

**Manual testing is mandatory** — see the section below.

### Key caveats

- All Three.js and three-bvh-csg dependencies load from `cdn.jsdelivr.net` at runtime in the browser. There are no npm runtime dependencies — only dev dependencies (`eslint`, `serve`).
- The UI language is Russian. All toolbar labels, status messages, and property panel text are in Russian.
- The project uses `type: "module"` in `package.json` and ES module `import`/`export` syntax throughout.
- Boolean operations preserve original meshes in memory (for undo) — do NOT dispose meshes in `replaceObjects()`.

### Mandatory testing after significant changes

After every significant code change (new features, refactoring, bug fixes affecting UI or 3D logic), you **must** run the quick checklist from `TEST_PLAN.md`:

1. Run `npm run lint` — must pass with zero errors.
2. Start the dev server (`npx serve . -p 3000 -s`) and open `http://localhost:3000/` in Chrome.
3. Run through the **quick checklist** (at the bottom of `TEST_PLAN.md`):
   - Page loads, 3 starter objects visible
   - Primitive creation works
   - Object selection by click works
   - Gizmo move works
   - Camera orbit (left-drag) works
   - Boolean subtraction executes
   - `Ctrl+Z` undoes the boolean operation (both originals restored)
   - `Ctrl+Z` undoes object creation
   - Delete key removes object
   - `Ctrl+S` downloads JSON
   - STL export downloads file
4. If the change touches a specific feature, also run the full section for that feature from `TEST_PLAN.md`.

The full test plan is in [`TEST_PLAN.md`](TEST_PLAN.md) — 13 sections covering all features.
