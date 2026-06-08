# Best-of-N optimization — results

Goal: smallest-bundle implementation of the snake game that passes a comprehensive
test suite. Behavior was **normalized to a conventional snake** (no instant move on
Play; 180° reversal ignored, not a death; one-turn-per-tick input buffering), while
keeping full feature + DOM/CSS parity. See `README.md` for the spec and metric.

## Metric

Compile with Svelte 5 (client, CSS injected) → esbuild bundle (Svelte runtime
external) → minify → gzip(9). Headline = **min+gzip bytes**. Every candidate shares
the same fixed markup + `<style>`, so size differences are purely the `<script>`
game logic. Correctness is a hard gate (18 behavioral tests + a static CSS check);
no partial credit.

## Round-over-round

| Round | Best passing | gzip | Δ vs prev | Δ vs baseline |
|------:|--------------|-----:|----------:|--------------:|
| 0 (baseline) | normalized reference | 2551 | — | — |
| 1 | `c10` flat-index + golf | **2371** | −180 (−7.1%) | −180 (−7.1%) |
| 2 | `r2-10-v10` all-out golf | **2320** | −51 (−2.1%) | −231 (−9.1%) |

Gains flattened (7.1% → 2.1%), and round-2 agents bottomed out around 2308–2320 —
the 2308 candidate (`r2-10-v11`) **failed** the reversal test, i.e. going smaller
started breaking correctness. **Stopped after round 2** (diminishing returns).

For reference, the *current shipped* `src/lib/Snake.svelte` is 2689 gzip but it
implements the **old** behavior (fails 6 normalized tests), so it is not a
like-for-like comparison; 2551 (the normalized reference) is the honest baseline.

## What won, and why

- **Flat single-index board** (`i = y*6+x`, deltas `[-6,1,6,-1]`) beat every other
  representation tried (tuples, `Set`, `Uint8Array`, `[dx,dy]` vectors).
- **Golf intensity** was the differentiator. Effective tricks that survived
  minification: `$effect` instead of importing `onMount`; one repeating
  `setInterval(move, 500)`; a column-delta wall test `((n%6 - h%6)**2 > 1)`;
  `dir ^ 2` for the opposite direction; arrow decode via `'URDL'.indexOf(key[5])`;
  dropping the `typeof localStorage` guard (effects never run during SSR).

## Deliverables (for your review — nothing merged)

- `winner/Snake.svelte` — **smallest** (2320 gzip), heavily golfed but passes 18/18 + CSS.
- `winner/Snake.readable.svelte` — readable flat-index (2451 gzip, +131 vs winner);
  the maintainability-friendly choice for a published library.
- `round1/ranked.json`, `round2/ranked.json` — full ranked results per round.
- `round1/scripts/`, `round2/scripts/` — candidate `<script>` blocks.

## Reproduce

```bash
npm install --no-save jsdom
node harness/run-candidate.mjs harness/winner/Snake.svelte   # PASS, gzip=2320
node harness/eval-round.mjs harness/round1                    # re-rank round 1
```
