# unicode-snake

[![npm version](https://img.shields.io/npm/v/unicode-snake.svg)](https://www.npmjs.com/package/unicode-snake)
[![license](https://img.shields.io/npm/l/unicode-snake.svg)](./LICENSE)
[![Publish to npm](https://github.com/matthewnoel/unicode-snake/actions/workflows/publish.yml/badge.svg)](https://github.com/matthewnoel/unicode-snake/actions/workflows/publish.yml)

A tiny [Svelte](https://svelte.dev) component that renders a playable snake game using nothing but Unicode characters. Drop it onto a page, press **Play**, and steer with the arrow keys.

> Every release is published to npm with [provenance attestations](https://docs.npmjs.com/generating-provenance-statements) via GitHub Actions [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) — no tokens involved.

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

Svelte 5 is a peer dependency, so make sure it's installed in your project.

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

### Persisting the high score

The board always tracks a high score for the current session. To keep it across reloads, pass a `highScoreKey` — it's used as the `localStorage` key:

```svelte
<Snake highScoreKey="my-app-snake-high-score" />
```

When `highScoreKey` is omitted (or when there's no `localStorage`, e.g. during server-side rendering), nothing is written to storage and the high score simply resets each session. Give separate boards distinct keys so they don't clobber one another.

## Props

| Prop             | Type     | Default | Description                                                                 |
| ---------------- | -------- | ------- | --------------------------------------------------------------------------- |
| `backgroundChar` | `string` | `⬜️`    | Character drawn on empty tiles.                                             |
| `playerChar`     | `string` | `😄`    | Character for the snake's head.                                             |
| `tailChar`       | `string` | `🍏`    | Character for each tail segment.                                            |
| `foodChar`       | `string` | `🍎`    | Character for the food to collect.                                          |
| `highScoreKey`   | `string` | `''`    | `localStorage` key for persisting the high score. Empty means session-only. |

## Controls

- Press **Play** to start (or restart after a game over).
- Steer with the **arrow keys**, or the on-screen **direction buttons** (handy on touch screens).
- The game ends if you hit a wall, run into your own tail, or reverse directly back into yourself. Your score is the length of the tail, and the best score so far is shown alongside it.

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
