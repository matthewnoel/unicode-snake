# Decision record — Snake bundle optimization (best-of-N)

- **Status:** Adopted on branch `optimize/snake-min-bundle` (commit migrating `src/lib/Snake.svelte`).
- **Date:** 2026-06-08
- **Owner:** @matthewnoel
- **Supersedes:** the previous `src/lib/Snake.svelte` behavior (see "Behavioral change" below).

## 1. Goal

Find the smallest-bundle implementation of this package's snake game that passes a
comprehensive, correctness-gating test suite — and leave behind a harness so the
exercise can be **re-run against any future model** and compared apples-to-apples.

## 2. Two decisions baked in up front

### 2a. Scope of "correct" (full parity)
A candidate must preserve everything the shipped component does *except* where
noted in 2b: 6×6 board, wall/self collision, growth-on-eat, food-never-on-snake,
500 ms tick, all 5 configurable char props, high-score tracking **and**
`localStorage` persistence, on-screen Play + ↑/↓/←/→ buttons, the
`.snake-grid-row` DOM contract, and the `:where()` style-isolation CSS. Because
the CSS + markup are a fixed required cost, the search was constrained to the
`<script>` game logic (see `assemble.mjs` / `template-body.html`), which is where
the real size differences live.

### 2b. Behavioral change: normalized to a conventional snake
We deliberately changed three behaviors from the old component (it had unusual
quirks). The new, adopted behavior is:
- **No instant move on Play** — the first step happens one tick (500 ms) later.
- **A 180° reversal is ignored** (a no-op), *not* a game over.
- **One-turn-per-tick input buffering** — a turn applies on the next tick, and a
  double-tap within a tick can never reverse the snake into its own neck.

The old `src/lib/Snake.svelte` (2689 gzip) fails 6 of the suite's tests *by
design* because it implements the old behavior. So it is **not** a like-for-like
size comparison; the honest baseline is a clean conventional implementation
("normalized reference", 2551 gzip, `reference/Snake.svelte`).

## 3. Fitness function (the ceiling)

- **Correctness (hard gate):** 18 behavioral tests + 1 static CSS check, run by
  `run-candidate.mjs`. Tests drive the real rendered component (jsdom + Svelte
  `mount` + fake timers + keyboard) and read state off the board, so they are
  agnostic to a candidate's internals. No partial credit. (Full list in
  `README.md`.)
- **Size (ranking key):** compile with Svelte 5 (client, CSS injected) → esbuild
  bundle with the Svelte runtime **external** → minify → gzip(9). Headline =
  **min+gzip bytes** (`measure.mjs`). One fixed config; deterministic.

The suite was validated before any optimization: the normalized reference passes
18/18; the old `src` fails exactly the 6 normalized-behavior tests; stripping the
isolation CSS or a compile error are both rejected. (Behavior cannot be spoofed,
which is how we confirmed no generated candidate had tampered with the tests.)

## 4. Method

Best-of-N via dynamic multi-agent workflows. Each agent wrote one `<script>`
against the fixed interface (`board`, `score`, `best`, `playing`, `play`, `turn`),
with a distinct representation/strategy. Survivors were ranked by gzip; later
rounds were seeded toward the winning direction. Generators are preserved in
`workflows/` so the prompts and strategies are reproducible.

## 5. Results

| Round | Best passing candidate | gzip | Δ prev | Δ baseline |
|------:|------------------------|-----:|-------:|-----------:|
| 0 | normalized reference | 2551 | — | — |
| 1 | `c10` flat-index + golf | 2371 | −180 (−7.1%) | −180 (−7.1%) |
| 2 | `r2-10-v10` all-out golf | **2320** | −51 (−2.1%) | −231 (−9.1%) |

- **35 of 36** verified candidates passed. Flat single-index board representation
  (`i = y*6+x`, deltas `[-6,1,6,-1]`) beat tuples, `Set`, `Uint8Array`, and
  `[dx,dy]` vectors. Golf intensity was the differentiator.
- **Stopped after round 2:** gains flattened (7.1% → 2.1%) and round-2 candidates
  bottomed out at 2308–2320 — the 2308 one (`r2-10-v11`) **failed** the reversal
  test, i.e. going smaller began breaking correctness. That is the practical floor
  for this design; a round 3 would chase <1% at rising token cost.

## 6. The options, and what we chose

| Option | gzip | Where | Verdict |
|--------|-----:|-------|---------|
| Old shipped component (old behavior) | 2689 | git history | Rejected — different behavior, largest |
| **Smallest** golfed `r2-10-v10` | 2320 | `winner/Snake.smallest-golfed.svelte` | **Runner-up, preserved** |
| **Adopted** readable flat-index `c02` | 2451 | `winner/Snake.adopted-readable.svelte` → `src/lib/Snake.svelte` | **Chosen** |

**Decision: adopt the readable flat-index version (2451), not the smaller golfed one (2320).**

Rationale: the golfed version saves only **131 gzip bytes (5.6%)** over the
readable one, but pays for it with maintainability hazards in a *published,
human-maintained* library — e.g. `dir ^ 2` for direction reversal, decoding arrow
keys via `'URDL'.indexOf(key[5])`, combined collision/wall expressions, and a
dropped `typeof localStorage` guard that is only safe because Svelte effects don't
run during SSR. The readable version captures **~94%** of the achievable reduction
(231 of 369 bytes vs the old component; 100 of 131 vs the floor) while staying
reviewable, debuggable, and obviously correct. For a tiny game component, the last
5% of bytes is not worth the readability cost. The smallest version is preserved
for anyone who later prioritizes pure size.

## 7. How to re-run this with a future model

The harness judges *any* candidate `Snake.svelte`, so it is model-agnostic.

```bash
npm install --no-save jsdom            # DOM for the behavioral tests (kept out of the manifest)

# A) Quick: judge a single candidate <script> a new model produced
node harness/assemble.mjs <script.txt> /tmp/x.svelte
node harness/run-candidate.mjs /tmp/x.svelte        # -> JSON: pass + gzip

# B) Rank a batch (drop <script>…</script> blocks into harness/roundN/scripts/*.txt)
node harness/eval-round.mjs harness/roundN          # writes ranked.json, prints the table

# C) Re-run the full generation with a new model
#    Launch Claude Code on the new model, then re-invoke the saved generators:
#      harness/workflows/round1-generate.workflow.js   (12 diverse strategies)
#      harness/workflows/round2-generate.workflow.js   (seeded toward winners)
#    They return {id, approach, script}; write each script to harness/roundN/scripts/<id>.txt,
#    then run eval-round.mjs as in (B).
```

Compare the new best gzip against the recorded numbers here (adopted 2451 /
smallest 2320 / reference 2551). If a future model beats 2320 **while passing all
18 tests + the CSS gate**, that's a genuine improvement worth considering.

### Notes / gotchas for the re-run
- Do **not** weaken or delete a test to make a candidate pass (the whole point is
  that the suite is the ceiling). If you change the spec, re-validate that the
  normalized reference still passes 18/18 and the old `src` still fails the
  intended tests.
- Agents will discover the harness and self-iterate if allowed; that improves
  quality but burns tokens. In these runs, both rounds were stopped early and the
  candidates salvaged — results were unaffected.
- `run-candidate.mjs` uses a shared staging path — evaluate candidates
  **sequentially**, not concurrently.
- All randomness in a candidate must come from `Math.random()` (seeded by the
  harness); ticks must be `setTimeout`/`setInterval` at 500 ms.
