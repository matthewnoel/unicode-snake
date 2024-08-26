<script lang="ts">
	export let backgroundChar = '⬜️';
	export let playerChar = '😄';
	export let tailChar = '🍏';
	export let foodChar = '🍎';
	import { onMount } from 'svelte';

	enum Orientation {
		North,
		East,
		South,
		West
	}

	let tail: Array<[number, number]> = [];
	let playerX = 0;
	let playerY = 0;
	let heartX = 1;
	let heartY = 1;
	let playerOrientation = Orientation.East;
	let isPlaying = false;

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
	const die = () => (isPlaying = false);
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
	onMount(() => {
		onkeydown = (event) => {
			if (!isPlaying) return;
			console.log(event.key);
			switch (event.key) {
				case 'ArrowUp':
					playerOrientation = Orientation.North;
					break;
				case 'ArrowRight':
					playerOrientation = Orientation.East;
					break;
				case 'ArrowDown':
					playerOrientation = Orientation.South;
					break;
				case 'ArrowLeft':
					playerOrientation = Orientation.West;
					break;
				default:
					break;
			}
		};
	});
	let unicodeRows = getUnicodeRows();
</script>

<p>Score: {tail.length}</p>
{#each unicodeRows as row}
	<span>{row}</span>
	<br />
{/each}
{#if !isPlaying}
	<input type="button" value="Play" on:click={play} />
{/if}
