import { builtinModules } from 'node:module';
import { defineConfig } from 'tsup';

export default defineConfig([
	{
		entry: ['./src/**/*.ts'],
		format: ['cjs'],
		splitting: true,
		minify: true,
		clean: true,
		target: 'esnext',
		outDir: 'dist',
		external: [...builtinModules],
		shims: true,
		bundle: true,
		dts: true,
		treeshake: true,
		tsconfig: './tsconfig.json',
	},
]);
