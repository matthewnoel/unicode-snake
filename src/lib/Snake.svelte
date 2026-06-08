<script lang="ts">
	import { onMount } from 'svelte';

	let {
		backgroundChar = '⬜️',
		playerChar = '😄',
		tailChar = '🍏',
		foodChar = '🍎',
		highScoreKey = ''
	}: {
		backgroundChar?: string;
		playerChar?: string;
		tailChar?: string;
		foodChar?: string;
		highScoreKey?: string;
	} = $props();

	const D = [-6, 1, 6, -1]; // N E S W: flat-index deltas

	let snake = $state([0]); // cell indices i = y*6+x, head first
	let food = $state(7); // (1,1)
	let playing = $state(false);
	let high = $state(0);
	let dir = 1; // committed direction
	let nextDir = 1; // buffered input
	let timer: ReturnType<typeof setTimeout>;

	let board = $derived.by(() => {
		const b = ['', '', '', '', '', ''];
		for (let i = 0; i < 36; i++)
			b[(i / 6) | 0] +=
				i === snake[0]
					? playerChar
					: i === food
						? foodChar
						: snake.includes(i)
							? tailChar
							: backgroundChar;
		return b;
	});
	let score = $derived(snake.length - 1);
	let best = $derived(Math.max(score, high));

	const persist = () => highScoreKey && typeof localStorage !== 'undefined';

	const spawn = () => {
		let f;
		do {
			f = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) * 6;
		} while (snake.includes(f));
		food = f;
	};

	const end = () => {
		playing = false;
		clearTimeout(timer);
	};

	const move = () => {
		dir = nextDir; // commit one buffered turn per tick
		const h = snake[0];
		const ni = h + D[dir];
		const c = h % 6;
		if (ni < 0 || ni > 35 || (dir === 1 && c === 5) || (dir === 3 && !c)) return end(); // wall
		const eat = ni === food;
		const next = [ni, ...snake];
		if (!eat) next.pop(); // drop furthest tail unless growing
		if (next.includes(ni, 1)) return end(); // self-collision vs post-move body
		snake = next;
		if (eat) {
			const sc = next.length - 1;
			if (sc > high) {
				high = sc;
				if (persist()) localStorage.setItem(highScoreKey, '' + sc);
			}
			spawn();
		}
	};

	const tick = () => {
		move();
		if (playing) timer = setTimeout(tick, 500);
	};

	const play = () => {
		snake = [0];
		dir = nextDir = 1;
		playing = true;
		spawn();
		timer = setTimeout(tick, 500); // first move one tick later
	};

	const turn = (d: number) => {
		if (!playing) return;
		// reject 180° reversal vs committed dir (allowed only with no body)
		if (snake.length > 1 && d === (dir + 2) % 4) return;
		nextDir = d;
	};

	onMount(() => {
		if (persist()) {
			const v = parseInt(localStorage.getItem(highScoreKey) ?? '0');
			high = v || 0;
		}
		const onKey = (e: KeyboardEvent) => {
			const k = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.key);
			if (k >= 0) turn(k);
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
				<p>{score}</p>
			</div>
			<div class="score-right">
				<p>High Score:</p>
				<p>{best}</p>
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
