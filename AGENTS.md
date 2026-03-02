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

### UI layout

- **Left panel ("Фигуры"):** primitive creation buttons (Куб, Сфера, Цилиндр, Конус, Тор).
- **Top toolbar:** boolean operations, delete, file I/O, undo/redo. Wraps to two rows on narrow screens.
- **Bottom-left corner:** XYZ axis indicator that rotates with the camera.
- **Status bar:** transform mode buttons with visible hotkey labels (`W`, `E`, `R`).

### Navigation

- Arrow keys (↑↓←→) move the camera through space (fly mode).
- Middle mouse button pans the camera.
- Left mouse drag orbits, scroll wheel zooms.

### Mandatory testing after significant changes

After every significant code change (new features, refactoring, bug fixes affecting UI or 3D logic), you **must** run the quick checklist from `TEST_PLAN.md`:

1. Run `npm run lint` — must pass with zero errors.
2. Start the dev server (`npx serve . -p 3000 -s`) and open `http://localhost:3000/` in Chrome.
3. Run through the **quick checklist** (at the bottom of `TEST_PLAN.md`):
   - Page loads, 3 starter objects visible
   - Primitive creation from left panel works
   - Object selection by click works
   - Gizmo move works
   - Camera orbit (left-drag) works
   - **Boolean subtraction via UI** (select cube → click Вычесть → click sphere → result replaces both, no console errors)
   - `Ctrl+Z` undoes the boolean operation (both originals restored)
   - `Ctrl+Z` undoes object creation
   - Delete key removes object
   - `Ctrl+S` downloads JSON
   - STL export downloads file
   - Arrow key navigation works
   - Axis indicator visible in bottom-left corner
4. If the change touches a specific feature, also run the full section for that feature from `TEST_PLAN.md`.

The full test plan is in [`TEST_PLAN.md`](TEST_PLAN.md) — 15 sections covering all features.
