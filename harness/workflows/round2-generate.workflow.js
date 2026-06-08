export const meta = {
  name: 'snake-script-bestofn-r2',
  description: 'Round 2: beat 2371 gzip, seeded toward flat-index + golf winners',
  phases: [{ title: 'Generate', detail: '10 candidates seeded toward winners' }],
}

const MR = ['Math', 'random'].join('.')
const RND = MR + '()'
const FLOOR = 'Math.floor(' + RND + ' * 6)'

const SPEC = `
You are writing the <script lang="ts"> block of a Svelte 5 snake-game component.
You write ONLY the script block. The component markup and <style> are FIXED and
appended automatically — do NOT output any markup or <style>.

The fixed markup binds to these names; your script MUST expose them at module top
level (reactive where they change over time):
  - board   : string[]  reactive — 6 strings of 6 single glyphs each; row y 0..5
              top->bottom, column x 0..5 left->right.
  - score   : number    reactive — current tail length.
  - best    : number    reactive — max(current score, high score).
  - playing : boolean   reactive.
  - play    : () => void           starts/restarts a game.
  - turn    : (d:number)=>void     d in {0,1,2,3}.
Markup, in effect:
  {#each board as row}<span class="snake-grid-row">{row}</span>{/each}
  Score: {score}   High Score: {best}
  {#if !playing} Play onclick={play} {:else} arrow buttons onclick={()=>turn(0..3)} {/if}

PROPS via $props(): backgroundChar='⬜️', playerChar='😄', tailChar='🍏', foodChar='🍎', highScoreKey=''
DIRECTIONS: 0=N(0,-1) 1=E(+1,0) 2=S(0,+1) 3=W(-1,0). Opposite of d is (d+2)%4.

BEHAVIOR (the test suite checks ALL of this — any failure scores zero):
1. 6x6 board; per cell glyph precedence head>food>tail>background; build rows by string
   concatenation of the chosen glyph (works for emoji AND single chars; never split codepoints).
2. Before first play: head at (0,0), food at (1,1), empty tail, playing=false, score 0, board rendered.
3. play(): head->(0,0), tail empty, committed dir=East, buffered dir=East, playing=true, spawn food
   on a random non-snake cell, start a 500ms timer. Do NOT move on play — first move is one tick later.
4. tick every 500ms exactly: one move, reschedule while playing.
5. move(): commit buffered dir; compute next head cell; if outside 6x6 -> GAME OVER (stop timer);
   eat = next===food; the leaving cell becomes a body segment; if not eating drop the furthest tail
   segment, else keep all (length +1); if next cell is in the POST-move body -> GAME OVER (you MUST
   allow following into the vacating tail-end cell); else move head; if eating spawn fresh food.
6. spawn(): uniform random cell via ${FLOOR} per axis, reject cells on head or body, repeat. Food NEVER on snake.
7. score=tail length. high=max length reached. Persist String(value) to localStorage[highScoreKey]
   on a new high when highScoreKey is non-empty AND localStorage exists. On mount load it (guard NaN->0).
   With no key: session high in memory only, write NOTHING. best=max(score,high).
8. onMount/effect: window 'keydown' (only while playing) ArrowUp->turn(0) ArrowRight->1 ArrowDown->2
   ArrowLeft->3; remove listener on cleanup.
9. turn(d): ignore if not playing; buffer d for the next tick; a 180 reversal is IGNORED (never a death),
   checked against the COMMITTED dir (not the buffered one) so a double-tap can't reverse into the neck;
   allow a reversal only when there is no body.
10. ALL randomness via ${RND} (seeded by the harness). Tick exactly 500ms.

HARD CONSTRAINTS: one <script lang="ts">...</script> block only; expose exactly board/score/best/
playing/play/turn; import only from 'svelte' (or use $effect and avoid imports). Valid Svelte 5 runes TS.

GOAL: produce the SMALLEST compiled+minified+gzipped component. The current best PASSING candidate is
2371 gzip — YOU MUST TRY TO BEAT IT. Techniques that produced the 2371 winner (build on these and push lower):
  - Flat single-index cells (i = y*6+x); head index, food index, tail as number[] of indices; deltas
    D=[-6,1,6,-1]. This beat tuple/Set/typed-array/vector representations.
  - Compact wall test: reject when next<0 or next>35 or the COLUMN difference between next and head
    exceeds 1 in magnitude (this catches horizontal wrap; vertical wrap is caught by the 0..35 bounds).
  - Build board in ONE loop appending the chosen glyph to 6 row strings.
  - Use $effect for the keydown listener + high-score load, so you don't import onMount.
  - Drive the tick with a single repeating 500ms timer calling move directly; move ends the game by
    clearing the timer (move need not check playing).
  - Decode the arrow direction from the 6th character (index 5) of the key name: 'U','R','D','L' map via
    a 4-letter lookup string.
  - Terse localStorage existence guard.
Local variable names are minified away — optimize STRUCTURE and operation count, not identifier length.
Correctness is a HARD gate; prefer correct-and-smaller.

SELF-CHECK (optional, SIZE ONLY — safe to run in parallel): write your script to /tmp/<id>.txt then run
  node harness/assemble.mjs /tmp/<id>.txt /tmp/<id>.svelte && node harness/measure.mjs /tmp/<id>.svelte
and read the "min+gzip" number. Do NOT modify or write any file under the repo (harness/, src/, etc.);
do NOT run the vitest/run-candidate harness (it would collide with other agents). Use /tmp only.

Return: approach (one short line) and script (the complete <script lang="ts">...</script> block).
`;

const STRATEGIES = [
  { id: 'r2-01', hint: 'Take the flat-index golfed approach and squeeze every remaining byte: combine variable declarations, remove intermediate variables, fold conditionals. Aim well under 2371.' },
  { id: 'r2-02', hint: 'Single-pass board: build from a 36-slot array pre-filled with backgroundChar, set tail indices, then food index, then head index, then join into 6 rows — golfed to the maximum. See if it undercuts the per-cell-loop board.' },
  { id: 'r2-03', hint: 'Avoid scanning the tail twice (once for the board, once for self-collision). Share one structure/lookup for both board rendering and collision to cut operations and code.' },
  { id: 'r2-04', hint: 'Minimize the number of reactive $state declarations to the absolute floor; fold score/best into derived expressions; keep only the essential reactive roots. Fewer reactivity roots = less compiled glue.' },
  { id: 'r2-05', hint: 'Explore deriving board with a plain $derived array expression (not $derived.by) and the most compact single-expression row builder. Compare compiled glue of $derived vs $derived.by.' },
  { id: 'r2-06', hint: 'Golf the high-score / localStorage path to the bare minimum (load + persist) using the terse typeof guard and unary + parsing, while keeping the no-key behavior correct.' },
  { id: 'r2-07', hint: 'Snake stored as ONE index array including the head at index 0 (no separate head var); unshift new head, pop unless eating; render snake[0] as player and the rest as tail. Golf it to beat 2371.' },
  { id: 'r2-08', hint: 'Micro-optimize the board loop: precompute nothing redundant, build rows with minimal arithmetic, and use the shortest correct glyph-selection ternary chain. Combine with all known winning tricks.' },
  { id: 'r2-09', hint: 'Wildcard: keep a single 36-char board STRING as state and mutate only the changed cells per move (head, vacated tail, new food, eaten food), slicing it into rows for display. See if incremental update is smaller than full rebuild.' },
  { id: 'r2-10', hint: 'All-out golf: combine flat-index, one-loop board, $effect lifecycle, single 500ms timer, column-delta wall test, key[5] decode, terse storage guard, and the fewest possible declarations into the smallest correct script you can write. This is the maximum-compression attempt.' },
]

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    approach: { type: 'string', description: 'one short line naming the optimization angle' },
    script: { type: 'string', description: 'the complete <script lang="ts"> ... </script> block' },
  },
  required: ['approach', 'script'],
}

phase('Generate')
const out = await parallel(
  STRATEGIES.map((s) => () =>
    agent(SPEC + '\n\n## YOUR ANGLE (candidate ' + s.id + ', scratch id ' + s.id + ')\n' + s.hint, {
      label: s.id,
      phase: 'Generate',
      schema: SCHEMA,
    }).then((r) => (r ? { id: s.id, approach: r.approach, script: r.script } : null))
  )
)
return out.filter(Boolean)
