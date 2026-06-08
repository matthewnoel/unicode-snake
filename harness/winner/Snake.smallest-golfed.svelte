<script lang="ts">
	let {
		backgroundChar = '⬜️',
		playerChar = '😄',
		tailChar = '🍏',
		foodChar = '🍎',
		highScoreKey = ''
	} = $props();

	let s = $state([0]);
	let f = $state(7);
	let playing = $state(false);
	let hi = $state(0);
	let dir, nd, timer: ReturnType<typeof setInterval>;

	let board = $derived.by(() => {
		let r = ['', '', '', '', '', ''];
		for (let i = 0; i < 36; i++)
			r[(i / 6) | 0] += i == s[0] ? playerChar : i == f ? foodChar : s.includes(i) ? tailChar : backgroundChar;
		return r;
	});
	let score = $derived(s.length - 1);
	let best = $derived(Math.max(score, hi));

	const spawn = () => {
		do f = ((Math.random() * 6) | 0) + ((Math.random() * 6) | 0) * 6;
		while (s.includes(f));
	};

	const move = () => {
		let n = s[0] + [-6, 1, 6, -1][(dir = nd)],
			b = n == f ? s : s.slice(0, -1);
		if (n < 0 || n > 35 || (n % 6 - s[0] % 6) ** 2 > 1 || b.includes(n)) return (playing = false);
		s = [n, ...b];
		if (score > hi) {
			hi = score;
			if (highScoreKey) localStorage[highScoreKey] = hi;
		}
		n == f && spawn();
	};

	const play = () => {
		clearInterval(timer);
		s = [0];
		dir = nd = 1;
		playing = true;
		spawn();
		timer = setInterval(move, 500);
	};

	const turn = (d: number) => {
		if (playing && (s.length < 2 || d != (dir ^ 2))) nd = d;
	};

	$effect(() => {
		if (highScoreKey) hi = +localStorage[highScoreKey] || 0;
		let k = (e: KeyboardEvent) => {
			let i = 'URDL'.indexOf(e.key[5]);
			~i && turn(i);
		};
		addEventListener('keydown', k);
		return () => removeEventListener('keydown', k);
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
