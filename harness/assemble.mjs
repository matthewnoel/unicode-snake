// Assemble a full Snake.svelte from a candidate <script> block + the fixed
// markup/style contract. Candidates only optimize the <script>; the DOM and CSS
// are held constant so size competition is purely about the game logic and the
// reactive interface (board, score, best, playing, play(), turn(d)).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE = readFileSync(join(here, 'template-body.html'), 'utf8');

export function assemble(scriptBlock) {
	return scriptBlock.replace(/\s+$/, '') + '\n' + TEMPLATE;
}

// CLI: node assemble.mjs <script.txt> <out.svelte>
if (import.meta.url === `file://${process.argv[1]}`) {
	const [, , scriptPath, outPath] = process.argv;
	if (!scriptPath || !outPath) {
		console.error('usage: node assemble.mjs <script.txt> <out.svelte>');
		process.exit(2);
	}
	writeFileSync(outPath, assemble(readFileSync(scriptPath, 'utf8')));
}
