// Fitness harness entry point.
//
//   node harness/run-candidate.mjs <path-to-candidate-Snake.svelte>
//
// Stages the candidate, runs the behavioral suite (jsdom), checks the static CSS
// contract, measures bundle size, and prints ONE line of JSON to stdout:
//
//   {"pass":true,"gzip":2231,"min":5904,"behaviorPass":true,"cssPass":true,
//    "failed":[],"error":null}
//
// pass === behaviorPass && cssPass. A human summary is written to stderr.
// NOTE: uses a shared staging path — run candidates SEQUENTIALLY, not concurrently.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { compile, preprocess } from 'svelte/compiler';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { measure } from './measure.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const stageDir = join(here, '_candidate');
const stageFile = join(stageDir, 'Snake.svelte');

// The style-isolation primitives a candidate must keep (whitespace-insensitive).
const CSS_REQUIRED = [':where(', 'box-sizing', 'white-space:pre'];

async function checkCss(svelteFilePath) {
	const source = readFileSync(svelteFilePath, 'utf8');
	const { code } = await preprocess(source, vitePreprocess({ script: true }), {
		filename: svelteFilePath
	});
	const { css } = compile(code, { filename: 'Snake.svelte', generate: 'client', css: 'external' });
	const flat = (css?.code ?? '').replace(/\s+/g, '');
	const missing = CSS_REQUIRED.filter((tok) => !flat.includes(tok));
	return { cssPass: missing.length === 0, missing };
}

function runVitest() {
	const out = join(here, '.vitest-result.json');
	rmSync(out, { force: true });
	let ran = true;
	try {
		execFileSync(
			join(repo, 'node_modules/.bin/vitest'),
			['run', '--config', 'harness/vitest.config.ts', '--reporter=json', `--outputFile=${out}`],
			{ cwd: repo, stdio: ['ignore', 'ignore', 'ignore'], timeout: 120000 }
		);
	} catch {
		ran = false; // non-zero exit = some tests failed (or a hard error); inspect the json
	}
	let report;
	try {
		report = JSON.parse(readFileSync(out, 'utf8'));
	} catch {
		return { behaviorPass: false, failed: ['<vitest produced no report>'], total: 0 };
	}
	const failed = [];
	let total = 0;
	for (const file of report.testResults ?? []) {
		for (const a of file.assertionResults ?? []) {
			total++;
			if (a.status !== 'passed') failed.push(a.title);
		}
	}
	const behaviorPass = ran && failed.length === 0 && total > 0;
	return { behaviorPass, failed, total };
}

async function main() {
	const candidate = process.argv[2];
	if (!candidate) {
		console.error('usage: node harness/run-candidate.mjs <candidate.svelte>');
		process.exit(2);
	}
	const result = {
		candidate,
		pass: false,
		gzip: null,
		min: null,
		behaviorPass: false,
		cssPass: false,
		total: 0,
		failed: [],
		error: null
	};
	try {
		mkdirSync(stageDir, { recursive: true });
		writeFileSync(stageFile, readFileSync(candidate, 'utf8'));

		// Size + CSS gate first (cheap, and catch compile errors early).
		const size = await measure(candidate);
		result.min = size.minBytes;
		result.gzip = size.gzBytes;
		const css = await checkCss(candidate);
		result.cssPass = css.cssPass;
		if (!css.cssPass) result.cssMissing = css.missing;

		const v = runVitest();
		result.behaviorPass = v.behaviorPass;
		result.failed = v.failed;
		result.total = v.total;

		result.pass = result.behaviorPass && result.cssPass;
	} catch (e) {
		result.error = e.message;
	}

	console.log(JSON.stringify(result));
	const tag = result.pass ? 'PASS' : 'FAIL';
	console.error(
		`[${tag}] ${candidate}  gzip=${result.gzip}  min=${result.min}  ` +
			`behavior=${result.behaviorPass ? 'ok' : `FAIL(${result.failed.length})`}  ` +
			`css=${result.cssPass ? 'ok' : 'FAIL'}` +
			(result.error ? `  error=${result.error}` : '') +
			(result.failed.length ? `\n  failed: ${result.failed.join(' | ')}` : '')
	);
}

main();
