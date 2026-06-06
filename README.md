# unicode-snake

A tiny [Svelte](https://svelte.dev) component that renders a playable snake game using nothing but Unicode characters. Drop it onto a page, press **Play**, and steer with the arrow keys.

```
⬜️⬜️⬜️⬜️⬜️⬜️
⬜️😄🍏⬜️⬜️⬜️
⬜️⬜️🍏⬜️⬜️⬜️
⬜️⬜️⬜️⬜️🍎⬜️
⬜️⬜️⬜️⬜️⬜️⬜️
⬜️⬜️⬜️⬜️⬜️⬜️
```

## Installation

```bash
npm install unicode-snake
```

Svelte 4 is a peer dependency, so make sure it's installed in your project.

## Usage

```svelte
<script>
	import { Snake } from 'unicode-snake';
</script>

<Snake />
```

### Customizing the characters

Every tile is a character, so you can re-theme the whole game by passing different ones:

```svelte
<Snake backgroundChar="⬛️" playerChar="🐍" tailChar="🟩" foodChar="🍓" />
```

## Props

| Prop             | Type     | Default | Description                          |
| ---------------- | -------- | ------- | ------------------------------------ |
| `backgroundChar` | `string` | `⬜️`    | Character drawn on empty tiles.      |
| `playerChar`     | `string` | `😄`    | Character for the snake's head.      |
| `tailChar`       | `string` | `🍏`    | Character for each tail segment.     |
| `foodChar`       | `string` | `🍎`    | Character for the food to collect.   |

## Controls

- Press **Play** to start (or restart after a game over).
- Use the **arrow keys** to change direction.
- The game ends if you hit a wall or run into your own tail. Your score is the length of the tail.

## Development

This is a [SvelteKit](https://kit.svelte.dev) library project. The component lives in `src/lib`, and `src/routes` is a small showcase app you can run locally.

```bash
npm install
npm run dev      # run the showcase app
npm run package  # build the publishable package into dist/
npm test         # run unit + integration tests
```

## License

[MIT](./LICENSE) © Matthew Noel
