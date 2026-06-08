import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		// `harness/` is research/optimization tooling, not shipped library code:
		// intentionally golfed candidates and workflow scripts that use injected
		// DSL globals (agent/parallel/phase). Lint it with the lib's rules and it
		// trips no-undef / no-unused-expressions. Not published (files: ["dist"]).
		ignores: ['build/', '.svelte-kit/', 'dist/', 'harness/']
	}
];
