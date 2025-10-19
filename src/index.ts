import { Server } from './http';
import { resolve } from 'node:path';

export * from './http';
export * from './plugins';
export * from './routing';
export * from './types';
export * from './core';
export * from './ws';

export const Synphony = Server;

/**
 * Default temporary folder path used by the framework
 * for storing runtime data, cache, or temporary files.
 */
export const DEFAULT_TEMP_PATH = resolve(process.cwd(), '.synphony');
