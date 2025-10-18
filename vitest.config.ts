import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const toPosix = (p: string) => p.replace(/\\/g, '/');

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['tests/**/*.spec.ts'],
		setupFiles: ['tests/setup.ts'],
		coverage: {
			reporter: ['text', 'html'],
			exclude: ['tests/helpers/**'],
		},
	},
	resolve: {
		alias: {
			'synphony': toPosix(resolve(__dirname, 'src')),
			'@src': toPosix(resolve(__dirname, 'src')),
			'@http': toPosix(resolve(__dirname, 'src/http')),
			'@plugins': toPosix(resolve(__dirname, 'src/plugins')),
			'@routing': toPosix(resolve(__dirname, 'src/routing')),
			'@core': toPosix(resolve(__dirname, 'src/core')),
			'@ws': toPosix(resolve(__dirname, 'src/ws')),
		},
	},
});
