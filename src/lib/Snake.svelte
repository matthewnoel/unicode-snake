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
		/**
		 * localStorage key used to persist the high score across sessions.
		 * When omitted (or in a non-browser environment) the high score is
		 * tracked for the current session only and never written to storage.
		 */
		highScoreKey?: string;
	}

	let {
		backgroundChar = '⬜️',
		playerChar = '😄',
		tailChar = '🍏',
		foodChar = '🍎',
		highScoreKey = ''
	}: Props = $props();

	enum Orientation {
		North,
		East,
		South,
		West
	}

	let highScore = $state(0);
	let tail: Array<[number, number]> = $state([]);
	let playerX = 0;
	let playerY = 0;
	let heartX = 1;
	let heartY = 1;
	let playerOrientation = Orientation.East;
	let isPlaying = $state(false);

	const sideLength = 6;
	const getUnicodeCharacter = (x: number, y: number) => {
		if (playerX === x && playerY === y) return playerChar;
		if (heartX === x && heartY === y) return foodChar;

		for (const element of tail) {
			if (element[0] === x && element[1] === y) return tailChar;
		}

		return backgroundChar;
	};
	const getUnicodeRows = () => {
		const retval = [];
		for (let y = 0; y < sideLength; y++) {
			let row = '';
			for (let x = 0; x < sideLength; x++) {
				row += getUnicodeCharacter(x, y);
			}
			retval.push(row);
		}
		return retval;
	};
	const isTail = (t: Array<[number, number]>, x: number, y: number) =>
		t.some((e) => e[0] === x && e[1] === y);

	const spawn = () => {
		let newHeartX = Math.floor(Math.random() * sideLength);
		let newHeartY = Math.floor(Math.random() * sideLength);

		while ((newHeartX === playerX && newHeartY === playerY) || isTail(tail, newHeartX, newHeartY)) {
			newHeartX = Math.floor(Math.random() * sideLength);
			newHeartY = Math.floor(Math.random() * sideLength);
		}

		heartX = newHeartX;
		heartY = newHeartY;
	};

	const canPersist = () => highScoreKey !== '' && typeof localStorage !== 'undefined';
	const getStoredHighScore = () => {
		if (!canPersist()) return 0;
		const parsed = parseInt(localStorage.getItem(highScoreKey) ?? '0', 10);
		return isNaN(parsed) ? 0 : parsed;
	};
	const trySetHighScore = (newScore: number) => {
		if (newScore <= highScore) return;
		highScore = newScore;
		if (canPersist()) localStorage.setItem(highScoreKey, newScore.toString());
	};
	const die = () => {
		trySetHighScore(tail.length);
		isPlaying = false;
	};
	const move = () => {
		const translation = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0]
		][playerOrientation];
		const newPlayerX = playerX + translation[0];
		const newPlayerY = playerY + translation[1];

		if (newPlayerX < 0 || newPlayerX >= sideLength || newPlayerY < 0 || newPlayerY >= sideLength)
			return die();

		const isIntersectingHeart = newPlayerX === heartX && newPlayerY === heartY;
		const start = isIntersectingHeart ? 0 : 1;
		const tuple: [number, number] = [playerX, playerY];
		const newTail = tail.length === 0 && start === 1 ? tail.slice() : [...tail.slice(start), tuple];

		if (isTail(newTail, newPlayerX, newPlayerY)) return die();

		tail = newTail;
		trySetHighScore(tail.length);
		playerX = newPlayerX;
		playerY = newPlayerY;

		if (isIntersectingHeart) spawn();
	};
	const tick = () => {
		if (!isPlaying) return;
		move();
		unicodeRows = getUnicodeRows();
		setTimeout(() => tick(), 500);
	};
	const play = () => {
		tail = [];
		playerX = 0;
		playerY = 0;
		playerOrientation = Orientation.East;
		isPlaying = true;
		spawn();
		tick();
	};

	const changeDirection = (direction: Orientation) => {
		if (!isPlaying) return;
		if (
			tail.length > 0 &&
			((direction === Orientation.North && playerOrientation === Orientation.South) ||
				(direction === Orientation.East && playerOrientation === Orientation.West) ||
				(direction === Orientation.South && playerOrientation === Orientation.North) ||
				(direction === Orientation.West && playerOrientation === Orientation.East))
		) {
			die();
			return;
		}
		playerOrientation = direction;
	};
	onMount(() => {
		highScore = getStoredHighScore();
		const handleKeydown = (event: KeyboardEvent) => {
			if (!isPlaying) return;
			switch (event.key) {
				case 'ArrowUp':
					changeDirection(Orientation.North);
					break;
				case 'ArrowRight':
					changeDirection(Orientation.East);
					break;
				case 'ArrowDown':
					changeDirection(Orientation.South);
					break;
				case 'ArrowLeft':
					changeDirection(Orientation.West);
					break;
				default:
					break;
			}
		};
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
	let unicodeRows = $state(getUnicodeRows());
</script>

<div class="outer-snake">
	<div class="inner-snake">
		<div class="snake-grid">
			{#each unicodeRows as row, index (index)}
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
				<p>{Math.max(tail.length, highScore)}</p>
			</div>
		</div>
		{#if !isPlaying}
			<input class="play-button" type="button" value="Play" onclick={play} />
		{:else}
			<div class="direction-buttons">
				<div class="button-row">
					<button class="vertical-button" onclick={() => changeDirection(Orientation.North)}
						>↑</button
					>
				</div>
				<div class="button-row">
					<button class="horizontal-button" onclick={() => changeDirection(Orientation.West)}
						>←</button
					>
					<button class="horizontal-button" onclick={() => changeDirection(Orientation.East)}
						>→</button
					>
				</div>
				<div class="button-row">
					<button class="vertical-button" onclick={() => changeDirection(Orientation.South)}
						>↓</button
					>
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
