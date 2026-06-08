import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// Self-contained vitest config for the fitness harness. Compiles the candidate
// Svelte component (svelte() auto-loads the repo svelte.config.js, so <script
// lang="ts"> is preprocessed exactly as in the real build) and runs the
// behavioral suite in jsdom.
export default defineConfig({
	plugins: [svelte()],
	// Force the `browser` export condition so `svelte` resolves to its client
	// build (where mount/flushSync exist) instead of the SSR build vitest would
	// otherwise pick.
	resolve: {
		conditions: ['browser']
	},
	test: {
		include: ['harness/snake.spec.ts'],
		environment: 'jsdom',
		// Inline svelte so it is transformed with the browser conditions above
		// rather than externalized and required through Node's SSR resolution.
		server: {
			deps: {
				inline: [/svelte/]
			}
		},
		// One file, run it in-process; keep startup minimal for per-candidate runs.
		pool: 'threads',
		globals: false,
		reporters: ['default']
	}
});
