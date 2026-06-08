<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		/** Character drawn on empty tiles. */
		backgroundChar?: string;
		/** Character for the snake's head. */
		playerChar?: string;
		/** Character for each tail segment. */
		tailChar?: string;
		/** Character for the food to collect. */
		foodChar?: string;
		/** localStorage key used to persist the high score across sessions. */
		highScoreKey?: string;
	}

	let {
		backgroundChar = '⬜️',
		playerChar = '😄',
		tailChar = '🍏',
		foodChar = '🍎',
		highScoreKey = ''
	}: Props = $props();

	const N = 6;
	// 0=North 1=East 2=South 3=West
	const DX = [0, 1, 0, -1];
	const DY = [-1, 0, 1, 0];

	let tail: Array<[number, number]> = $state([]);
	let headX = $state(0);
	let headY = $state(0);
	let foodX = $state(1);
	let foodY = $state(1);
	let dir = 1; // committed direction (drives movement)
	let nextDir = 1; // buffered input, applied on the next tick
	let playing = $state(false);
	let high = $state(0);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const onSnake = (x: number, y: number) =>
		(x === headX && y === headY) || tail.some((s) => s[0] === x && s[1] === y);

	const charAt = (x: number, y: number) => {
		if (x === headX && y === headY) return playerChar;
		if (x === foodX && y === foodY) return foodChar;
		if (tail.some((s) => s[0] === x && s[1] === y)) return tailChar;
		return backgroundChar;
	};

	let board = $derived(
		Array.from({ length: N }, (_, y) =>
			Array.from({ length: N }, (_, x) => charAt(x, y)).join('')
		)
	);

	const persist = () => highScoreKey !== '' && typeof localStorage !== 'undefined';
	const bump = (score: number) => {
		if (score <= high) return;
		high = score;
		if (persist()) localStorage.setItem(highScoreKey, String(score));
	};

	const spawn = () => {
		let x: number;
		let y: number;
		do {
			x = Math.floor(Math.random() * N);
			y = Math.floor(Math.random() * N);
		} while (onSnake(x, y));
		foodX = x;
		foodY = y;
	};

	const end = () => {
		playing = false;
		if (timer) clearTimeout(timer);
	};

	const move = () => {
		dir = nextDir; // commit the buffered turn (one per tick)
		const nx = headX + DX[dir];
		const ny = headY + DY[dir];
		if (nx < 0 || nx >= N || ny < 0 || ny >= N) return end(); // wall

		const eat = nx === foodX && ny === foodY;
		const next: Array<[number, number]> = [[headX, headY], ...tail];
		if (!eat) next.pop(); // drop the tail end unless we grew this tick

		if (next.some((s) => s[0] === nx && s[1] === ny)) return end(); // self

		tail = next;
		headX = nx;
		headY = ny;
		bump(tail.length);
		if (eat) spawn();
	};

	const tick = () => {
		if (!playing) return;
		move();
		if (playing) timer = setTimeout(tick, 500);
	};

	const play = () => {
		tail = [];
		headX = 0;
		headY = 0;
		dir = 1;
		nextDir = 1;
		playing = true;
		spawn();
		timer = setTimeout(tick, 500); // no instant move — first step is one tick later
	};

	const turn = (d: number) => {
		if (!playing) return;
		// Ignore a 180° reversal (validated against the committed direction, so a
		// double-tap within one tick can never reverse the snake into its neck).
		if (tail.length > 0 && d === (dir + 2) % 4) return;
		nextDir = d;
	};

	onMount(() => {
		if (persist()) {
			const v = parseInt(localStorage.getItem(highScoreKey) ?? '0', 10);
			high = isNaN(v) ? 0 : v;
		}
		const onKey = (e: KeyboardEvent) => {
			if (!playing) return;
			switch (e.key) {
				case 'ArrowUp':
					turn(0);
					break;
				case 'ArrowRight':
					turn(1);
					break;
				case 'ArrowDown':
					turn(2);
					break;
				case 'ArrowLeft':
					turn(3);
					break;
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<div class="outer-snake">
	<div class="inner-snake">
		<div class="snake-grid">
			{#each board as row, index (index)}
				<span class="snake-grid-row">{row}</span>
				<br />
			{/each}
		</div>
		<div class="score-container">
			<div class="score-left">
				<p>Score:</p>
				<p>{tail.length}</p>
			</div>
			<div class="score-right">
				<p>High Score:</p>
				<p>{Math.max(tail.length, high)}</p>
			</div>
		</div>
		{#if !playing}
			<input class="play-button" type="button" value="Play" onclick={play} />
		{:else}
			<div class="direction-buttons">
				<div class="button-row">
					<button class="vertical-button" onclick={() => turn(0)}>↑</button>
				</div>
				<div class="button-row">
					<button class="horizontal-button" onclick={() => turn(3)}>←</button>
					<button class="horizontal-button" onclick={() => turn(1)}>→</button>
				</div>
				<div class="button-row">
					<button class="vertical-button" onclick={() => turn(2)}>↓</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/*
	 * The component is meant to "drop in and just work", so it can't assume
	 * anything about the host page. Svelte scopes these selectors (preventing
	 * the styles from leaking out), but scoping is not a Shadow DOM boundary:
	 * inherited properties still cascade in from ancestors. The :where()
	 * resets below neutralise the host's inherited typography/box model
	 * without raising specificity, so the host can still intentionally
	 * override us if it wants to.
	 */
	.outer-snake,
	.outer-snake :where(*),
	.outer-snake :where(*)::before,
	.outer-snake :where(*)::after {
		box-sizing: border-box;
	}
	.outer-snake {
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: center;
		/* Neutralise inherited text layout that would distort the grid. */
		direction: ltr;
		text-align: left;
		letter-spacing: normal;
		word-spacing: normal;
		font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', system-ui, sans-serif;
	}
	.inner-snake {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.snake-grid {
		display: block;
		/*
		 * The board is square only if every glyph shares one cell size, so
		 * pin the typography here rather than inheriting it from the host.
		 */
		font-size: 1rem;
		line-height: 1rem;
		letter-spacing: normal;
		word-spacing: normal;
		white-space: pre;
		direction: ltr;
		text-align: left;
	}
	.snake-grid-row {
		font-size: 1rem;
		line-height: 1rem;
		white-space: pre;
	}
	.score-container {
		width: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: space-between;
	}
	.score-container p {
		margin: 0;
		padding: 0;
		font-size: 1rem;
		line-height: 1rem;
		font-weight: 600;
	}
	.score-left {
		text-align: left;
	}
	.score-right {
		text-align: right;
	}
	.play-button {
		margin-top: 1rem;
		padding: 0.5rem 1.5rem;
		font: inherit;
		font-size: 1rem;
		color: inherit;
		background-color: #f0f0f0;
		border: 2px solid #ccc;
		border-radius: 0.25rem;
		cursor: pointer;
	}
	.play-button:hover {
		background-color: #e0e0e0;
	}
	.play-button:active {
		background-color: #d0d0d0;
	}
	.direction-buttons {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
	.button-row {
		display: flex;
		gap: 0.5rem;
	}
	.vertical-button {
		width: 3rem;
		height: 2.5rem;
		font-size: 1.2rem;
	}
	.horizontal-button {
		width: 2.5rem;
		height: 2.5rem;
		font-size: 1.2rem;
	}
	.direction-buttons button {
		margin: 0;
		padding: 0;
		font-family: inherit;
		line-height: normal;
		color: inherit;
		background-color: #f0f0f0;
		border: 2px solid #ccc;
		border-radius: 0.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.direction-buttons button:hover {
		background-color: #e0e0e0;
	}
	.direction-buttons button:active {
		background-color: #d0d0d0;
	}
</style>
