import { defineConfig } from 'tsup';

export default defineConfig([
	{
		entry: ['./src/**/*.ts'],
		format: ['esm'],
		splitting: true,
		minify: true,
		clean: true,
		target: 'esnext',
		outDir: 'dist',
		platform: 'node',
		external: [],
		shims: true,
		bundle: true,
		dts: true,
		treeshake: true,
		tsconfig: './tsconfig.json',
	},
]);
