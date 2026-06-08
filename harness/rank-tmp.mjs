// Dedupe all /tmp/r2-*.txt agent scratch candidates, rank by gzip (compile-only,
// fast — correctness verified separately on the top contenders).
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assemble } from './assemble.mjs';
import { measure } from './measure.mjs';

const prefix = process.argv[2] || 'r2-';
const outDir = process.argv[3] || 'harness/round2/all';
mkdirSync(outDir, { recursive: true });

const files = readdirSync('/tmp').filter((f) => new RegExp('^' + prefix + '.*\\.txt$').test(f));
const seen = new Map();
for (const f of files) {
	const c = readFileSync('/tmp/' + f, 'utf8');
	if (!c.includes('<script')) continue;
	const h = createHash('md5').update(c).digest('hex');
	if (!seen.has(h)) seen.set(h, { file: f, content: c, src: Buffer.byteLength(c) });
}
const uniq = [...seen.values()];
console.error(`unique candidates: ${uniq.length} (from ${files.length} files)`);

const rows = [];
for (const u of uniq) {
	const sv = outDir + '/' + u.file.replace(/\.txt$/, '.svelte');
	writeFileSync(sv, assemble(u.content));
	try {
		const m = await measure(sv);
		rows.push({ file: u.file, svelte: sv, src: u.src, gzip: m.gzBytes, min: m.minBytes });
	} catch (e) {
		rows.push({ file: u.file, svelte: sv, src: u.src, gzip: null, err: e.message.slice(0, 50) });
	}
}
rows.sort((a, b) => (a.gzip ?? 1e9) - (b.gzip ?? 1e9));
writeFileSync(outDir + '/../gzip-rank.json', JSON.stringify(rows, null, 2));

console.log('\n=== ranked by gzip (compile-only; correctness NOT yet verified) ===');
for (const r of rows.slice(0, 22))
	console.log(
		`  ${String(r.gzip ?? 'ERR').padStart(5)} gzip  ${String(r.min ?? '').padStart(5)} min  ${r.file}  ${r.err || ''}`
	);
console.log(
	`\ntotal measured: ${rows.length}; best gzip (unverified): ${rows[0].gzip} (${rows[0].file})`
);
