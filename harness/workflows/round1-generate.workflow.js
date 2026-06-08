export const meta = {
	name: 'snake-script-bestofn-r1',
	description: 'Generate 12 diverse minimal Snake <script> implementations (round 1)',
	phases: [{ title: 'Generate', detail: '12 candidate scripts, distinct strategies' }]
};

const MR = ['Math', 'random'].join('.'); // avoid literal token in script source
const RND = MR + '()';
const FLOOR = 'Math.floor(' + RND + ' * 6)';

const SPEC = `
You are writing the <script lang="ts"> block of a Svelte 5 snake-game component.
You write ONLY the script block. The component's markup and <style> are FIXED and
appended automatically — do NOT output any markup or <style>.

The fixed markup binds to these names, which your script MUST expose at the top
level of the module (reactive where the value changes over time):
  - board   : string[]  reactive — 6 strings, each exactly 6 single glyphs; row y
              top->bottom (0..5), column x left->right (0..5).
  - score   : number    reactive — current tail length.
  - best    : number    reactive — max(current score, high score).
  - playing : boolean   reactive — is a game in progress.
  - play    : () => void    starts/restarts a game (bound to the Play button).
  - turn    : (d:number)=>void   d in {0,1,2,3} (bound to keys and arrow buttons).
The markup is, in effect:
  {#each board as row}<span class="snake-grid-row">{row}</span>{/each}
  Score: {score}    High Score: {best}
  {#if !playing} Play onclick={play} {:else} arrow buttons onclick={()=>turn(0..3)} {/if}

PROPS (exact names + defaults) via $props():
  backgroundChar = '⬜️', playerChar = '😄', tailChar = '🍏', foodChar = '🍎', highScoreKey = ''

DIRECTIONS: 0=North(dx 0,dy -1) 1=East(+1,0) 2=South(0,+1) 3=West(-1,0). Opposite of d is (d+2)%4.

BEHAVIORAL SPEC (this is exactly what the test suite checks — all must hold):
1. Board 6x6. Per-cell glyph precedence: head=playerChar, else food=foodChar, else
   a tail segment=tailChar, else backgroundChar. Build rows by STRING CONCATENATION
   of the chosen glyph per cell (works for multi-codepoint emoji AND single chars).
   Never split glyphs by codepoint.
2. BEFORE the first play: head at (0,0), food at a fixed NON-origin cell (use (1,1)),
   empty tail, playing=false, score 0, board already rendered. (Tests assert exactly
   one head glyph, one food glyph, zero tail glyphs, head at (0,0).)
3. play(): reset head to (0,0), tail to empty, committed direction = East(1), buffered
   direction = East(1), playing=true, spawn() a food on a random non-snake cell, and
   start a 500ms timer. CRUCIAL: do NOT move on play — the first move happens one tick
   (500ms) LATER.
4. The tick runs every 500ms (setTimeout or setInterval, exactly 500): exactly one
   move per tick, then reschedule while playing.
5. move():
   - commit the buffered direction (one turn per tick).
   - compute the next head cell.
   - WALL: if next cell is outside the 6x6 board -> GAME OVER (playing=false, stop timer).
   - eat = (next cell === food cell).
   - body update: the cell the head leaves becomes a body segment; if NOT eating, drop
     the FURTHEST tail segment (length unchanged); if eating, keep all segments (length +1).
   - SELF-COLLISION: if the next head cell is occupied by a body segment AFTER the drop
     -> GAME OVER. You MUST allow following into the cell the tail end is vacating
     (check against the POST-move body, not the pre-move body).
   - otherwise commit the head move; if eating, spawn() a fresh food.
6. spawn(): pick a uniformly random cell using ${FLOOR} for each axis and REJECT any
   cell occupied by the head or a body segment; repeat until clear. Food must NEVER sit
   on the snake.
7. SCORE = tail length. HIGH SCORE = max length ever reached this session. Persist to
   localStorage[highScoreKey] (store String(value)) whenever a new high is reached AND
   highScoreKey !== '' AND typeof localStorage !== 'undefined'. On mount, load the stored
   high from localStorage[highScoreKey] when key+storage exist (parseInt, guard NaN->0).
   With NO key: track the session high in memory only and write NOTHING to localStorage.
   best = max(current score, high).
8. CONTROLS: arrow keys work ONLY while playing. In onMount, add a window 'keydown'
   listener: ArrowUp->turn(0) ArrowRight->turn(1) ArrowDown->turn(2) ArrowLeft->turn(3).
   Return a cleanup that removes the listener.
9. turn(d): ignore when not playing. INPUT BUFFERING: do not change movement instantly —
   store d as the buffered (next) direction, applied on the next tick. A 180 degree
   reversal must be IGNORED (a no-op) — NEVER a death. The reversal check MUST compare d
   against the COMMITTED (currently-moving) direction, NOT the pending buffered one, so a
   double-tap within one tick (e.g. moving East, press Up then Left) can never reverse the
   snake into its neck. Allow a reversal only when there is no body (length-1 snake).
10. DETERMINISM: ALL randomness via ${RND} (the harness seeds it). Tick exactly 500ms.

HARD CONSTRAINTS:
- Output a single <script lang="ts"> ... </script> block. No markup, no <style>.
- Expose exactly: board, score, best, playing, play, turn (reactive where they change).
- Only import from 'svelte' (e.g. onMount). No other imports or dependencies.
- Must compile under Svelte 5 runes ($props, $state, $derived). TypeScript must be valid.

OPTIMIZATION GOAL: minimize the component's compiled+minified+gzipped size. Fewer reactive
$state declarations, simpler board construction, and less total code tend to compile
smaller. Local variable names are minified away, so optimize STRUCTURE and operation count,
not identifier length. BUT correctness is a hard gate: a candidate failing ANY behavior
above scores zero. Prefer correct-and-small over clever-and-risky.

Return:
  approach : one short line naming your representation/strategy.
  script   : the complete <script lang="ts"> ... </script> block.
`;

const STRATEGIES = [
	{
		id: 'c01',
		hint: 'Classic tuples. Separate headX/headY $state, tail as array of [x,y] tuples, food as foodX/foodY. board via nested loops. Direction via DX/DY arrays. Clean and minimal; the conservative baseline approach.'
	},
	{
		id: 'c02',
		hint: 'Flat single-index cells. Every cell is i = y*6+x (0..35). Snake = array of indices (head first). Food = an index. Moves: north -6, south +6, east +1, west -1, with wall checks via column = i%6 and row = (i/6|0). Build a 36-char board string, then slice into 6 rows. Minimize the number of state vars.'
	},
	{
		id: 'c03',
		hint: 'Single packed $state object holding the entire game {snake, food, dir, next, playing, high}; derive board/score/best with $derived. Explore whether one $state object compiles smaller than many separate $state vars.'
	},
	{
		id: 'c04',
		hint: 'Board-string-first. Snake as array of [x,y], food as [x,y]. Build the whole board in one pass that produces a 36-char string then splits to rows. Inline collision with array.some. Few helper functions.'
	},
	{
		id: 'c05',
		hint: 'Snake-as-cell-array with the head INCLUDED at index 0 (no separate head vars). On move, unshift the new head and pop unless eating. Render snake[0] as the player glyph and snake[1..] as tail. Reduce state to: snake[], food, dir, next, playing, high.'
	},
	{
		id: 'c06',
		hint: 'Use a Set of occupied "x,y" keys for O(1) collision and spawn rejection, plus an ordered array for tail dropping. Investigate whether a Set helps or hurts compiled size versus array.some.'
	},
	{
		id: 'c07',
		hint: 'Typed-array occupancy: a Uint8Array(36) marks occupied cells for collision and food rejection; an ordered index array tracks the snake for tail dropping. Numeric, branch-light.'
	},
	{
		id: 'c08',
		hint: 'Direction stored directly as a [dx,dy] vector in state (no orientation index). Reversal check via dx === -ndx && dy === -ndy. turn(d) maps 0..3 to vectors. Snake as [x,y] tuples.'
	},
	{
		id: 'c09',
		hint: 'Derived-heavy / functional. Maximize $derived (board, score, best, and an occupied lookup); keep the imperative move() as small as possible. See if derived chains compile compactly.'
	},
	{
		id: 'c10',
		hint: 'Aggressive code-golf of the classic tuple approach: collapse helper functions into move()/turn(), use ternaries and combined declarations, minimize operation count and intermediate structures, while staying valid Svelte 5 TS.'
	},
	{
		id: 'c11',
		hint: 'Compute rows with Array.from / map closures instead of imperative concatenation loops. Snake and food as flat indices. Aim for compiler-friendly compact output.'
	},
	{
		id: 'c12',
		hint: 'Hybrid flat-index: snake as indices; build the board by starting from a 36-slot array filled with backgroundChar, then set tail indices to tailChar, food index to foodChar, head index to playerChar, then join into 6 rows. Single pass, minimal branching.'
	}
];

const SCHEMA = {
	type: 'object',
	additionalProperties: false,
	properties: {
		approach: {
			type: 'string',
			description: 'one short line naming the representation/strategy used'
		},
		script: {
			type: 'string',
			description: 'the complete <script lang="ts"> ... </script> block, no markup or style'
		}
	},
	required: ['approach', 'script']
};

phase('Generate');
const out = await parallel(
	STRATEGIES.map(
		(s) => () =>
			agent(SPEC + '\n\n## YOUR ASSIGNED STRATEGY (candidate ' + s.id + ')\n' + s.hint, {
				label: s.id,
				phase: 'Generate',
				schema: SCHEMA
			}).then((r) => (r ? { id: s.id, approach: r.approach, script: r.script } : null))
	)
);
return out.filter(Boolean);
