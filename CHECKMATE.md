# CheckMate (local verification)

Commands must run from **this project root**, not `~`. Running from home fails because specs and npm scripts live here.

```bash
cd "/Users/scottstadum/Developer/Amy Lloyd/Convergence/ConvergenceApp"
npm install
npm run test
npx checkmate status combodiet-e2e
```

Or use npm wrappers (same directory):

```bash
npm run checkmate:status
mkdir -p .cursor && export CM_FIX_COUNT=0 && npm run checkmate:affected
```

## Install

CheckMate is a **project** devDependency (`checkmateai@^0.1.6`). Prefer `npx checkmate` or `./node_modules/.bin/checkmate` after `npm install` in this folder.

Do **not** rely on a global install or a `package.json` in `~` — that does not include this app’s specs or Playwright tests.

## Specs

- Spec file: `checkmate/specs/combodiet-e2e.md`
- The CLI resolves specs when the current working directory is ConvergenceApp.

## Git / `checkmate affected`

There is **no** `.git` in ConvergenceApp; the detected git root is `/Users/scottstadum` (home, often with no commits). `checkmate affected` may error on `git diff HEAD` and scan unrelated paths. For Cursor rules, prefer the checked-in `.cursor/cm_list.json` or run `npm run checkmate:affected` and commit the result when you only care about this app.

To fix long-term: `git init` in ConvergenceApp (or move the repo root here) so affected files match the project.

## Cloned `richardsondx/checkmate` repo

A source clone of [richardsondx/checkmate](https://github.com/richardsondx/checkmate) was **not** found under `~/checkmate` (that path is CheckMate **data**, not the GitHub repo). For day-to-day use, **`checkmateai` from npm** in this project is enough; `npx checkmate status combodiet-e2e` works after `cd` here.

If you clone the repo for development:

```bash
gh repo clone richardsondx/checkmate ~/Developer/checkmate
cd ~/Developer/checkmate
npm install
npm run build   # if the repo defines a build script — check its README
npm link
cd "/Users/scottstadum/Developer/Amy Lloyd/Convergence/ConvergenceApp"
npm link checkmateai   # optional; only if developing the CLI locally
```

## Known limitation

`checkmate run-script cm-enforce run --target ... --fail-early` can fail on Node 24 with checkmateai 0.1.6 (ESM/CJS in `cm-enforce.js`). Use `npm run test` / `npm run test:e2e` and `npx checkmate status combodiet-e2e` until the package is updated.
