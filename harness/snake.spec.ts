// Behavioral fitness suite for a candidate Snake.svelte (staged at ./_candidate/Snake.svelte).
//
// "Correct" = the normalized, conventional-snake spec agreed with the maintainer:
//   - full feature + DOM parity (configurable chars, high-score + localStorage,
//     on-screen Play + direction buttons, 6 .snake-grid-row spans, Score:/High Score: labels)
//   - NO instant move on Play (first step is one tick later)
//   - a 180° reversal is IGNORED (no-op), never a death
//   - one-turn-per-tick input buffering: an input applies on the next tick, and a
//     double-tap within a tick can never reverse the snake into its own neck
//   - deterministic 500ms tick; all randomness from Math.random (seeded here)
//
// Tests drive the REAL rendered component (jsdom + Svelte mount + fake timers +
// keyboard events) and read state back off the board, so they are agnostic to a
// candidate's internal structure. Harness contract a candidate must honor:
//   * renders 6 rows of 6 single chars (with single-char props) in .snake-grid-row
//   * uses the 5 documented props for all glyphs
//   * food placement uses Math.random()
//   * ticks via setTimeout/setInterval at 500ms
//   * Score:/High Score: labels each immediately followed by their value element
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Snake from './_candidate/Snake.svelte';

const CHARS = { backgroundChar: '.', playerChar: 'P', tailChar: 't', foodChar: 'f' };
const TICK = 500;
const DX = [0, 1, 0, -1]; // N E S W
const DY = [-1, 0, 1, 0];
const KEY = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];

function mulberry32(seed: number) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

let host: HTMLElement;
let app: ReturnType<typeof mount>;
let realRandom: () => number;

function settle() {
	flushSync();
}
function mountGame(props: Record<string, unknown> = {}, seed = 12345) {
	Math.random = mulberry32(seed);
	host = document.createElement('div');
	document.body.appendChild(host);
	app = mount(Snake, { target: host, props: { ...CHARS, ...props } });
	settle();
}
function remount(props: Record<string, unknown> = {}, seed = 12345) {
	if (app) {
		try {
			unmount(app);
		} catch {
			/* ignore */
		}
	}
	host?.remove();
	mountGame(props, seed);
}

function rows(): string[] {
	return Array.from(host.querySelectorAll('.snake-grid-row')).map((el) => el.textContent ?? '');
}
function find(ch: string): [number, number] | null {
	const r = rows();
	for (let y = 0; y < r.length; y++) {
		const x = r[y].indexOf(ch);
		if (x >= 0) return [x, y];
	}
	return null;
}
function head(): [number, number] {
	const h = find('P');
	if (!h) throw new Error('no head on board');
	return h;
}
function food(): [number, number] {
	const f = find('f');
	if (!f) throw new Error('no food on board');
	return f;
}
function tailCells(): Array<[number, number]> {
	const r = rows();
	const out: Array<[number, number]> = [];
	for (let y = 0; y < r.length; y++)
		for (let x = 0; x < r[y].length; x++) if (r[y][x] === 't') out.push([x, y]);
	return out;
}
function score(): number {
	return tailCells().length;
}
function playControl(): HTMLElement | null {
	return (
		(Array.from(host.querySelectorAll('input,button')).find(
			(el) =>
				(el as HTMLInputElement).value === 'Play' || el.textContent?.trim() === 'Play'
		) as HTMLElement) ?? null
	);
}
function arrowButton(label: string): HTMLElement | null {
	return (
		(Array.from(host.querySelectorAll('button')).find(
			(el) => el.textContent?.trim() === label
		) as HTMLElement) ?? null
	);
}
function isPlaying(): boolean {
	// Playing iff the Play control is gone (direction controls are shown instead).
	return playControl() == null;
}
function labeledValue(label: string): string | null {
	const el = Array.from(host.querySelectorAll('p,span,div,strong,b')).find(
		(e) => e.textContent?.trim() === label
	);
	const sib = el?.nextElementSibling;
	return sib?.textContent?.trim() ?? null;
}
function clickPlay() {
	const btn = playControl();
	if (!btn) throw new Error('Play control not found');
	btn.click();
	settle();
}
function press(dir: number) {
	window.dispatchEvent(new window.KeyboardEvent('keydown', { key: KEY[dir] }));
	settle();
}
function step(n = 1) {
	for (let i = 0; i < n; i++) {
		vi.advanceTimersByTime(TICK);
		settle();
	}
}

// Greedy driver: takes a step toward (tx,ty), never reversing the committed
// direction, never stepping onto a wall or a (non-vacating) body cell. Tracks the
// committed direction from the observed head delta. Returns the direction moved,
// or -1 if it could not move (stuck / game over).
let committed = 1;
function freshGameState() {
	committed = 1;
}
function stepToward(tx: number, ty: number): number {
	if (!isPlaying()) return -1;
	const [hx, hy] = head();
	const body = new Set(tailCells().map(([x, y]) => `${x},${y}`));
	// last tail segment will vacate this tick, so it is a legal target
	const tcells = tailCells();
	if (tcells.length) body.delete(`${tcells[tcells.length - 1][0]},${tcells[tcells.length - 1][1]}`);

	const dx = tx - hx;
	const dy = ty - hy;
	const prefs: number[] = [];
	if (Math.abs(dx) >= Math.abs(dy)) {
		if (dx > 0) prefs.push(1);
		if (dx < 0) prefs.push(3);
		if (dy > 0) prefs.push(2);
		if (dy < 0) prefs.push(0);
	} else {
		if (dy > 0) prefs.push(2);
		if (dy < 0) prefs.push(0);
		if (dx > 0) prefs.push(1);
		if (dx < 0) prefs.push(3);
	}
	// fallbacks: any direction that is legal
	for (const d of [0, 1, 2, 3]) if (!prefs.includes(d)) prefs.push(d);

	for (const d of prefs) {
		if (d === (committed + 2) % 4) continue; // no reversal
		const nx = hx + DX[d];
		const ny = hy + DY[d];
		if (nx < 0 || nx >= 6 || ny < 0 || ny >= 6) continue;
		if (body.has(`${nx},${ny}`)) continue;
		press(d);
		step(1);
		if (!isPlaying()) return -1;
		const [ax, ay] = head();
		if (ax === nx && ay === ny) {
			committed = d;
			return d;
		}
		return -1; // moved unexpectedly (shouldn't happen)
	}
	return -1;
}
// Grow the snake to at least `target` tail segments by chasing food.
function growTo(target: number, cap = 400): boolean {
	let guard = 0;
	while (score() < target && isPlaying() && guard++ < cap) {
		const [fx, fy] = food();
		const moved = stepToward(fx, fy);
		if (moved < 0) return false;
	}
	return score() >= target;
}
// Drive the head to (tx,ty) without (deliberately) eating-driven detours.
function driveHeadTo(tx: number, ty: number, cap = 60): boolean {
	let guard = 0;
	while (isPlaying() && guard++ < cap) {
		const [hx, hy] = head();
		if (hx === tx && hy === ty) return true;
		if (stepToward(tx, ty) < 0) return false;
	}
	const [hx, hy] = head();
	return hx === tx && hy === ty;
}

beforeEach(() => {
	realRandom = Math.random;
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
	freshGameState();
	mountGame();
});

afterEach(() => {
	try {
		unmount(app);
	} catch {
		/* ignore */
	}
	host?.remove();
	vi.useRealTimers();
	Math.random = realRandom;
	document.body.innerHTML = '';
	try {
		localStorage.clear();
	} catch {
		/* ignore */
	}
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendering & DOM contract
// ─────────────────────────────────────────────────────────────────────────────
describe('rendering & DOM contract', () => {
	it('renders a 6x6 grid in six .snake-grid-row spans', () => {
		const r = rows();
		expect(r).toHaveLength(6);
		for (const line of r) expect(line.length).toBe(6);
	});

	it('uses the props for every glyph (head + food + background before play)', () => {
		const r = rows().join('');
		expect((r.match(/P/g) || []).length).toBe(1); // exactly one head
		expect((r.match(/f/g) || []).length).toBe(1); // exactly one food
		expect((r.match(/t/g) || []).length).toBe(0); // no tail yet
		expect((r.match(/\./g) || []).length).toBe(36 - 2); // rest background
		expect(find('P')).toEqual([0, 0]); // head starts at origin
	});

	it('re-themes entirely from props (custom chars render)', () => {
		remount({ backgroundChar: '_', playerChar: 'H', foodChar: '*', tailChar: 'o' });
		const r = rows().join('');
		expect((r.match(/H/g) || []).length).toBe(1);
		expect((r.match(/\*/g) || []).length).toBe(1);
		expect(r.includes('.')).toBe(false);
	});

	it('shows Score: and High Score: labels', () => {
		const text = host.textContent ?? '';
		expect(text).toContain('Score:');
		expect(text).toContain('High Score:');
		expect(labeledValue('Score:')).toBe('0');
	});

	it('shows Play before playing and the four direction buttons after Play', () => {
		expect(playControl()).not.toBeNull();
		expect(arrowButton('↑')).toBeNull();
		clickPlay();
		expect(playControl()).toBeNull();
		for (const a of ['↑', '↓', '←', '→']) expect(arrowButton(a)).not.toBeNull();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Movement, ticking, input buffering (normalized)
// ─────────────────────────────────────────────────────────────────────────────
describe('movement & deterministic ticking', () => {
	it('does NOT move on Play; the first step happens one tick later', () => {
		clickPlay();
		expect(isPlaying()).toBe(true);
		expect(head()).toEqual([0, 0]); // no instant move
		step(1);
		expect(head()).toEqual([1, 0]); // moved East exactly once
	});

	it('advances exactly one cell per 500ms tick and not before', () => {
		clickPlay();
		vi.advanceTimersByTime(TICK - 1);
		settle();
		expect(head()).toEqual([0, 0]); // 499ms: no move
		vi.advanceTimersByTime(1);
		settle();
		expect(head()).toEqual([1, 0]); // 500ms: one move
		step(1);
		expect(head()).toEqual([2, 0]); // and one more
	});

	it('a buffered turn applies on the next tick (not instantly)', () => {
		clickPlay();
		press(2); // ArrowDown
		expect(head()).toEqual([0, 0]); // input does not move the head immediately
		step(1);
		expect(head()).toEqual([0, 1]); // applied South on the tick
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Reversal rule (normalized: ignored, never a death)
// ─────────────────────────────────────────────────────────────────────────────
describe('180° reversal guard', () => {
	it('with a body, reversing is ignored (no death, keeps direction)', () => {
		clickPlay();
		expect(growTo(1)).toBe(true); // snake now has a body, still moving
		const dirBefore = committed;
		const [hx, hy] = head();
		press((dirBefore + 2) % 4); // try to reverse straight back
		step(1);
		expect(isPlaying()).toBe(true); // not a game over
		// it kept going in (close to) its committed direction, not backwards
		const [ax, ay] = head();
		expect([ax - hx, ay - hy]).not.toEqual([-DX[dirBefore], -DY[dirBefore]]);
	});

	it('a double-tap within one tick cannot reverse the snake into its neck', () => {
		clickPlay();
		expect(growTo(2)).toBe(true); // length-3 snake: an allowed reversal WOULD be fatal
		expect(driveHeadTo(2, 2)).toBe(true); // park in the interior, known committed dir
		const d = committed;
		const back = (d + 2) % 4; // the reversal (must be rejected by the buffer)
		// choose a perpendicular 90° turn whose next cell is free and in-bounds
		const occupied = new Set([
			`${head()[0]},${head()[1]}`,
			...tailCells().map(([x, y]) => `${x},${y}`)
		]);
		const turnDir = [(d + 1) % 4, (d + 3) % 4].find((p) => {
			const nx = head()[0] + DX[p];
			const ny = head()[1] + DY[p];
			return nx >= 0 && nx < 6 && ny >= 0 && ny < 6 && !occupied.has(`${nx},${ny}`);
		});
		expect(turnDir).toBeDefined();
		press(turnDir as number); // valid 90° turn, buffered
		press(back); // second tap tries to reverse relative to the committed dir
		step(1);
		expect(isPlaying()).toBe(true); // survived — the reversal was dropped, not applied
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Game-over conditions
// ─────────────────────────────────────────────────────────────────────────────
describe('game over: wall collision', () => {
	it('ends the game when the head crosses a wall', () => {
		clickPlay(); // moving East from (0,0)
		// step to the east wall: (1,0)..(5,0)
		for (let i = 0; i < 5; i++) step(1);
		expect(isPlaying()).toBe(true);
		expect(head()[0]).toBe(5);
		step(1); // would move to x=6 → wall
		expect(isPlaying()).toBe(false);
	});
});

describe('game over: self collision', () => {
	it('ends the game when the head runs into its own body', () => {
		clickPlay();
		expect(growTo(4)).toBe(true); // length-5 snake (4 tail + head)
		expect(driveHeadTo(2, 2)).toBe(true); // park in the interior
		// Turn clockwise every tick: a >4-length snake cannot fit the 4-cell loop
		// and must run into itself (staying interior, so this is NOT a wall death).
		let guard = 0;
		while (isPlaying() && guard++ < 8) {
			press((committed + 1) % 4); // right turn (never a reversal)
			const before = head();
			step(1);
			const after = head();
			if (after[0] === before[0] && after[1] === before[1] && isPlaying()) break;
			committed = (committed + 1) % 4;
		}
		expect(isPlaying()).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Food
// ─────────────────────────────────────────────────────────────────────────────
describe('food spawning', () => {
	it('never spawns food on the head or tail across many spawns', () => {
		clickPlay();
		let eats = 0;
		let guard = 0;
		while (eats < 6 && isPlaying() && guard++ < 400) {
			const before = score();
			const [fx, fy] = food();
			if (stepToward(fx, fy) < 0) break;
			if (score() > before) {
				eats++;
				// just spawned a new food — assert it is clear of the snake
				const [nfx, nfy] = food();
				const [hx, hy] = head();
				expect([nfx, nfy]).not.toEqual([hx, hy]);
				for (const [tx, ty] of tailCells()) expect([nfx, nfy]).not.toEqual([tx, ty]);
			}
		}
		expect(eats).toBeGreaterThanOrEqual(3);
	});

	it('is reproducible under a fixed seed (deterministic ticks + seeded RNG)', () => {
		const record = () => {
			const frames: string[] = [];
			remount({}, 777);
			clickPlay();
			for (let i = 0; i < 25; i++) {
				// a fixed, board-independent input pattern
				if (i % 4 === 0) press(2);
				if (i % 4 === 2) press(1);
				step(1);
				frames.push(rows().join('|'));
			}
			return frames;
		};
		const a = record();
		const b = record();
		expect(b).toEqual(a);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Growth timing
// ─────────────────────────────────────────────────────────────────────────────
describe('growth timing', () => {
	it('grows by exactly one on the tick it eats, and not on other ticks', () => {
		clickPlay();
		// drive adjacent to the food, then take the eating step explicitly
		const [fx, fy] = food();
		// approach until the head is orthogonally adjacent to the food
		let guard = 0;
		while (isPlaying() && guard++ < 60) {
			const [hx, hy] = head();
			if (Math.abs(hx - fx) + Math.abs(hy - fy) === 1) break;
			if (stepToward(fx, fy) < 0) break;
		}
		const [hx, hy] = head();
		expect(Math.abs(hx - fx) + Math.abs(hy - fy)).toBe(1);
		const lenBefore = score();
		const eatDir = hx === fx ? (fy > hy ? 2 : 0) : fx > hx ? 1 : 3;
		press(eatDir);
		step(1); // eating step
		expect(head()).toEqual([fx, fy]); // head moved onto the food cell
		expect(score()).toBe(lenBefore + 1); // grew by exactly one
		const newFood = food();
		expect(newFood).not.toEqual([fx, fy]); // a fresh food appeared elsewhere
		// a subsequent non-eating step must not change the length
		const lenAfter = score();
		const [nfx, nfy] = food();
		// move in a direction that does not eat the new food
		const safe = [0, 1, 2, 3].find((d) => {
			const nx = head()[0] + DX[d];
			const ny = head()[1] + DY[d];
			return (
				d !== (committed + 2) % 4 &&
				nx >= 0 &&
				nx < 6 &&
				ny >= 0 &&
				ny < 6 &&
				!(nx === nfx && ny === nfy)
			);
		});
		if (safe !== undefined) {
			press(safe);
			step(1);
			if (isPlaying()) expect(score()).toBe(lenAfter);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Score & high-score persistence
// ─────────────────────────────────────────────────────────────────────────────
describe('score & high score', () => {
	it('the displayed Score equals the tail length', () => {
		clickPlay();
		expect(growTo(2)).toBe(true);
		expect(labeledValue('Score:')).toBe(String(score()));
		expect(score()).toBeGreaterThanOrEqual(2);
	});

	it('persists the high score to localStorage[highScoreKey] and reloads it', () => {
		localStorage.clear();
		remount({ highScoreKey: 'hsk' }, 999);
		clickPlay();
		expect(growTo(3)).toBe(true);
		const reached = score();
		expect(parseInt(localStorage.getItem('hsk') ?? '0', 10)).toBeGreaterThanOrEqual(reached);
		// a fresh mount with the same key should load the stored high score
		remount({ highScoreKey: 'hsk' }, 5);
		expect(parseInt(labeledValue('High Score:') ?? '0', 10)).toBeGreaterThanOrEqual(reached);
	});

	it('tracks a session high score but writes nothing when no key is given', () => {
		localStorage.clear();
		clickPlay();
		expect(growTo(2)).toBe(true);
		const reached = score();
		expect(parseInt(labeledValue('High Score:') ?? '0', 10)).toBeGreaterThanOrEqual(reached);
		expect(localStorage.length).toBe(0);
	});
});
