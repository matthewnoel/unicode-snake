// Bundle-size measurement for a candidate Snake.svelte.
//
// Methodology (one fixed config so numbers are comparable across runs):
//   1. Preprocess the .svelte file with vitePreprocess (strips <script lang="ts">),
//      exactly as the real `svelte-package` build does.
//   2. Compile with the Svelte 5 compiler: client output, CSS injected into the JS
//      so the whole component (logic + styles) is a single artifact.
//   3. Bundle with esbuild, marking the Svelte runtime EXTERNAL (it is a peer
//      dependency, shared across the host app — it is not part of this
//      component's marginal contribution to a consumer's bundle).
//   4. Minify, then gzip (level 9).
//
// Reports raw-minified bytes and gzipped bytes. The headline number is min+gzip.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { compile, preprocess } from 'svelte/compiler';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import * as esbuild from 'esbuild';

export async function measure(svelteFilePath) {
	const source = readFileSync(svelteFilePath, 'utf8');

	// 1. Strip TypeScript from <script lang="ts"> just like the published build.
	const { code: preprocessed } = await preprocess(source, vitePreprocess({ script: true }), {
		filename: svelteFilePath
	});

	// 2. Compile with the Svelte 5 compiler (client, CSS folded into the JS).
	const { js, warnings } = compile(preprocessed, {
		filename: 'Snake.svelte',
		name: 'Snake',
		generate: 'client',
		css: 'injected',
		dev: false
	});

	// 3 + 4. Bundle (svelte runtime external), minify.
	const built = await esbuild.build({
		stdin: {
			contents: js.code,
			resolveDir: process.cwd(),
			sourcefile: 'Snake.js',
			loader: 'js'
		},
		bundle: true,
		minify: true,
		format: 'esm',
		target: 'es2020',
		legalComments: 'none',
		external: ['svelte', 'svelte/*'],
		write: false
	});

	const minified = built.outputFiles[0].text;
	const minBytes = Buffer.byteLength(minified, 'utf8');
	const gzBytes = gzipSync(Buffer.from(minified, 'utf8'), { level: 9 }).length;

	return { minBytes, gzBytes, warnings: warnings.map((w) => w.message) };
}

// CLI: node measure.mjs <path-to-Snake.svelte> [--json]
if (import.meta.url === `file://${process.argv[1]}`) {
	const file = process.argv[2];
	if (!file) {
		console.error('usage: node measure.mjs <path-to-Snake.svelte> [--json]');
		process.exit(2);
	}
	measure(file)
		.then((r) => {
			if (process.argv.includes('--json')) {
				console.log(JSON.stringify(r));
			} else {
				console.log(`file:        ${file}`);
				console.log(`min bytes:   ${r.minBytes}`);
				console.log(`min+gzip:    ${r.gzBytes}`);
				if (r.warnings.length) console.log(`warnings:    ${r.warnings.length}`);
			}
		})
		.catch((e) => {
			console.error('MEASURE ERROR:', e.message);
			process.exit(1);
		});
}
