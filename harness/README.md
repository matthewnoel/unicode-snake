# Snake fitness harness

Best-of-N optimization harness for `unicode-snake`. Given a candidate
`Snake.svelte`, it emits **PASS/FAIL + bundle size in bytes** so candidates can be
gated on correctness and ranked by size.

## Setup

Requires a DOM for the behavioral tests (kept out of the repo manifest on purpose):

```bash
npm install --no-save jsdom
```

## Run one candidate

```bash
node harness/run-candidate.mjs <path-to-candidate-Snake.svelte>
```

Prints one line of JSON to stdout and a human summary to stderr:

```json
{
	"candidate": "...",
	"pass": true,
	"gzip": 2542,
	"min": 7032,
	"behaviorPass": true,
	"cssPass": true,
	"total": 18,
	"failed": [],
	"error": null
}
```

`pass = behaviorPass && cssPass`. **Run candidates sequentially** — they share the
`_candidate/` staging path.

## What is measured ("size")

One fixed config so numbers are comparable (`measure.mjs`):

1. Preprocess `.svelte` (`vitePreprocess` — strips `<script lang="ts">`), exactly as `svelte-package` does.
2. Compile with the Svelte 5 compiler: `generate:'client'`, `css:'injected'` (logic + styles in one artifact).
3. Bundle with esbuild, **Svelte runtime external** (it's a shared peer dep, not this component's marginal cost).
4. Minify, then gzip(level 9). Headline number = **min+gzip bytes**.

## What is tested ("correct")

Behavioral suite (`snake.spec.ts`) drives the real rendered component in jsdom
(Svelte `mount` + fake timers + keyboard events) and reads state back off the
board, so it is agnostic to a candidate's internals.

**Normalized, conventional-snake spec** (agreed with the maintainer):

- 6×6 board; draw precedence head > food > tail > background.
- **No instant move on Play** — the first step is one tick later.
- Deterministic **500 ms** tick (one move per tick; nothing at 499 ms).
- One-turn-per-tick **input buffering**: an input applies on the next tick; a
  double-tap within a tick can never reverse the snake into its neck.
- A **180° reversal is ignored** (no-op), never a death.
- Wall collision and self-collision end the game.
- Growth by exactly one on the eating tick (head onto food, new food spawns clear of the snake).
- Food never spawns on the snake; runs are reproducible under a fixed seed.
- Score = tail length; high score tracked per session and persisted to
  `localStorage[highScoreKey]` (loaded on mount) when a key is given.
- Full feature/DOM parity: 5 configurable char props, on-screen Play + ↑/↓/←/→
  buttons, six `.snake-grid-row` spans, `Score:` / `High Score:` labels.

Plus a static **CSS contract** gate (`run-candidate.mjs`): the compiled CSS must
keep the style-isolation primitives `:where(`, `box-sizing`, `white-space:pre`.

## Candidate contract

A candidate must, to be measurable by this harness:

- render 6 rows of 6 **single chars** (with single-char props) in `.snake-grid-row` spans;
- use the 5 documented props for every glyph;
- source all randomness from `Math.random()`;
- tick via `setTimeout`/`setInterval` at 500 ms;
- render each of `Score:` / `High Score:` as a label element immediately followed
  by its value element;
- keep the style-isolation `:where()` CSS.

## Files

- `measure.mjs` — bundle-size measurement (also a CLI).
- `snake.spec.ts` — the behavioral suite (18 tests).
- `vitest.config.ts` — self-contained vitest config (jsdom, browser resolve conditions).
- `run-candidate.mjs` — stage + test + CSS gate + measure → JSON.
- `reference/Snake.svelte` — known-good normalized implementation (round-0 baseline).
- `_candidate/` — staging area (overwritten each run).
