// Evaluate a round of candidate <script> blocks.
//
//   node harness/eval-round.mjs <round-dir>
//
// <round-dir> must contain scripts/*.txt (each a full <script>…</script> block).
// Assembles each with the fixed template, runs the fitness harness SEQUENTIALLY
// (shared staging), and writes:
//   <round-dir>/assembled/<name>.svelte   — full components
//   <round-dir>/results.json              — every result
//   <round-dir>/ranked.json               — survivors sorted by gzip asc
// Prints a ranked table to stdout.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from './assemble.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');

const roundDir = process.argv[2];
if (!roundDir) {
	console.error('usage: node harness/eval-round.mjs <round-dir>');
	process.exit(2);
}
const scriptsDir = join(roundDir, 'scripts');
const asmDir = join(roundDir, 'assembled');
mkdirSync(asmDir, { recursive: true });

const scripts = readdirSync(scriptsDir)
	.filter((f) => f.endsWith('.txt'))
	.sort();

const results = [];
for (const f of scripts) {
	const name = basename(f, '.txt');
	const svelte = join(asmDir, `${name}.svelte`);
	writeFileSync(svelte, assemble(readFileSync(join(scriptsDir, f), 'utf8')));
	let json;
	try {
		const out = execFileSync('node', ['harness/run-candidate.mjs', svelte], {
			cwd: repo,
			encoding: 'utf8',
			timeout: 180000
		});
		json = JSON.parse(out.trim().split('\n').pop());
	} catch (e) {
		json = { candidate: svelte, pass: false, gzip: null, error: e.message, failed: [] };
	}
	json.name = name;
	results.push(json);
	const tag = json.pass ? 'PASS' : 'FAIL';
	process.stderr.write(
		`[${tag}] ${name.padEnd(16)} gzip=${json.gzip ?? '—'} ` +
			`${json.pass ? '' : `(${json.error ? json.error : (json.failed || []).length + ' tests / css=' + json.cssPass})`}\n`
	);
}

const survivors = results
	.filter((r) => r.pass)
	.sort((a, b) => a.gzip - b.gzip);

writeFileSync(join(roundDir, 'results.json'), JSON.stringify(results, null, 2));
writeFileSync(join(roundDir, 'ranked.json'), JSON.stringify(survivors, null, 2));

console.log('\n=== RANKED SURVIVORS (smallest gzip first) ===');
if (!survivors.length) console.log('(none passed)');
survivors.forEach((r, i) => {
	console.log(`${String(i + 1).padStart(2)}. ${r.name.padEnd(16)} gzip=${r.gzip}  min=${r.min}`);
});
const failed = results.filter((r) => !r.pass);
console.log(
	`\n${survivors.length}/${results.length} passed.` +
		(failed.length ? ` Failed: ${failed.map((r) => r.name).join(', ')}` : '')
);
if (survivors.length) console.log(`Best this round: ${survivors[0].name} @ ${survivors[0].gzip} gzip`);
