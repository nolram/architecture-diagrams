# AGENTS.md

TypeScript CLI (`arch-diagram`) that renders YAML/JSON specs to SVG (+ optional PNG/PDF). Three diagram engines are dispatched by the spec's `type` field: `architecture` (default), `uml-class`, `c4`.

## Commands

- `npm test` — node:test via tsx; fully offline, no services needed
- Single test file: `npx tsx --test tests/layout.test.ts` (add `--test-name-pattern="..."` to filter by name)
- `npm run typecheck` — `tsc --noEmit` over `src/` and `tests/`
- `npm run build` — `tsc` → `dist/`
- `npm run validate:skill` / `npm run validate:icons` — see below
- Render without building: `npx tsx src/cli.ts spec.yaml --png -o out.svg`
- No linter or formatter is configured
- CI order (Node 24): typecheck → build → validate:skill → validate:icons → test → smoke-render `examples/*.yaml`

## Architecture

- `src/engines/registry.ts` maps spec `type` → engine; the CLI reads `type` from the raw YAML before validation (src/cli.ts:22)
- The `architecture` engine reuses shared `src/spec` (zod), `src/layout` (ELK.js), `src/render` (SVG), `src/export` (PNG/PDF); the `uml-class` and `c4` engines are self-contained under `src/engines/<name>/` (own schema/layout/render)
- README's "Project structure" section is stale — it doesn't mention `src/engines/`

## Icons

- Source of truth: `src/icons/catalog.ts`; `architecture-diagrams/reference/icon-catalog.md` is a hand-maintained mirror for the skill — update both when adding/removing icons
- `npm run validate:icons` verifies every catalog entry resolves against installed thesvg/@iconify-json/mdi
- A missing icon key is a warning + fallback badge, not a failure
- Custom icons: `icon: file:./logo.svg` resolves relative to the spec file's directory; 200KB cap; unsafe SVG (script/on*/javascript:) is rejected

## Skill (`architecture-diagrams/`)

- Self-contained Claude Skill (SKILL.md + reference/ + scripts/render.sh) and the release artifact: tag `v*.*.*` → release.yml runs the checks, `npm run package:skill` zips it to `architecture-diagrams.skill`, publishes a GitHub Release
- SKILL.md frontmatter is validated by `npm run validate:skill`: allowed keys name/description/license/allowed-tools/metadata/compatibility; name kebab-case ≤64 chars; description ≤1024 chars, no `<`/`>`
- Delegate to sub-agents sequentially, and review their implementation, act as leader and delegate the tasks to sub-agents and review their work.

## Gotchas

- ESM + NodeNext: relative imports in `src/` must end in `.js` (e.g. `./types.js`)
- CI smoke test only renders top-level `examples/*.yaml` — examples in subdirs (`c4/`, `uml/`) are not smoke-tested in CI
- `dist/`, `output/`, `.tests-ignore/`, `*.skill` are gitignored scratch/build artifacts
- Commit style: imperative, e.g. "Add C4 diagram engine (v0.6 roadmap, closes v0.6)"; ROADMAP.md = committed work, IDEAS.md = idea pool
- Before creating a release tag `vX.Y.Z`, verify `package.json` `version` equals `X.Y.Z` — bump it in the same change if it doesn't (tag and package.json must stay in sync)
