import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Server } from '@src/http';
import { DEFAULT_TEMP_PATH, type Plugin } from '@src/index';
import { CustomLogger } from '@core/utils/logger';

interface LoggerPluginOptions {
  logPath?: string;        // Custom log file path (default: temp/logs/server.log)
  interactive?: boolean;   // Enables interactive CustomLogger behavior (e.g., spinners, dynamic updates)
  saveToFile?: boolean;    // If true, logs will be written to a file
  showInConsole?: boolean; // If true, logs will be printed to the console
}

/**
 * ANSI color codes for formatting log messages.
 * Used to highlight status codes and other log entries with color in the console.
 */
const colorize = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',

  /**
   * Returns a color based on the HTTP status code.
   * - 2xx: green (success)
   * - 3xx: cyan (redirect)
   * - 4xx: yellow (client error)
   * - 5xx: red (server error)
   * - default: gray (unknown or other)
   */
  status(code: number) {
    if (code >= 500) return colorize.red;
    if (code >= 400) return colorize.yellow;
    if (code >= 300) return colorize.cyan;
    if (code >= 200) return colorize.green;
    return colorize.gray;
  },
};

/**
 * Writes a log message to a file.
 * Ensures that the log directory exists and appends the message with a timestamp.
 *
 * @param filePath - Path to the log file.
 * @param message - The message to append to the log.
 */
async function writeToFile(filePath: string, message: string): Promise<void> {
  try {
    const resolved = resolve(filePath);
    const dir = dirname(resolved);
    await fs.mkdir(dir, { recursive: true }); // Create directories if missing
    await fs.appendFile(resolved, `[${new Date().toISOString()}] ${message}\n`, 'utf-8');
  } catch (err) {
    console.error('[LoggerPlugin] Failed to write log file:', (err as Error).message);
  }
}

/**
 * Logger Plugin
 *
 * A flexible logging plugin for the HTTP/WebSocket server.
 * It can display logs in the console, save them to a file, or both.
 *
 * Supported events:
 * - `listening`: server started successfully
 * - `closed`: server stopped
 * - `request`: HTTP request received
 * - `socketConnection`: new WebSocket connection
 * - `socketClose`: WebSocket closed
 * - `not-found`: HTTP 404 responses
 * - `error`: general or uncaught errors
 *
 * @param options - Logger configuration (path, output modes, interactivity)
 */
export function logger(options: LoggerPluginOptions = {}): Plugin<Server> {
  const {
    logPath = join(DEFAULT_TEMP_PATH, 'logs', 'server.log'),
    interactive = false,
    saveToFile = true,
    showInConsole = true,
  } = options;

  return (server) => {
    // Create an instance of CustomLogger with optional interactive mode
    const log = new CustomLogger({
      config: { displayTimestamp: true },
      interactive,
      scope: 'SERVER',
    });

    /**
     * Core log handler.
     * Sends a message to the console (if enabled) and writes it to a file (if enabled).
     *
     * @param message - The message to log.
     * @param consoleFn - The CustomLogger method to use (info, warn, error, etc.).
     */
    const logMessage = async (
      message: string,
      consoleFn: (msg: string) => void = log.log.bind(log)
    ) => {
      if (showInConsole) consoleFn(message);

      if (saveToFile) {
        // Remove ANSI escape sequences before writing to file
        // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
                const clean = message.replace(/\x1b\[[0-9;]*m/g, '');
        await writeToFile(logPath, clean);
      }
    };

    /** Handles the 'listening' event — triggered when the server starts successfully. */
    server.on('listening', () => {
      const info = [
        `Loaded ${server.count.http} HTTP route${server.count.http === 1 ? '' : 's'}.`,
        `Loaded ${server.count.ws} WebSocket route${server.count.ws === 1 ? '' : 's'}.`,
        `Server running at ${server.address.url}`,
      ];

      info.forEach(async (msg, i) => {
        if (i < 2) await logMessage(`[INFO] ${msg}`, log.info.bind(log));
        else await logMessage(`[WATCH] ${msg}`, log.watch.bind(log));
      });

      if (showInConsole) log.blank(); // Adds a visual line break for clarity
    });

    /** Handles the 'closed' event — triggered when the server shuts down. */
    server.on('closed', async () => {
      const msg = '[SERVER] Server has stopped gracefully.';
      if (showInConsole) log.blank();
      await logMessage(msg, log.success.bind(log));
    });

    /** Handles every HTTP request — logs the status code, method, and URL. */
    server.on('request', async (req, res) => {
      const color = colorize.status(res.statusCode);
      const msg = `${color}[${res.statusCode}]${colorize.reset} ${req.method} ${req.url}`;
      await logMessage(msg, log.scope(req.method).log.bind(log));
    });

    /** Logs when a new WebSocket connection is established. */
    server.on('socketConnection', async (socket, request) => {
      const msg = `${colorize.green}[WS CONNECT]${colorize.reset} ${request.url} (id: ${socket.id})`;
      await logMessage(msg, log.scope('WS').log.bind(log));
    });

    /** Logs when a WebSocket connection is closed. */
    server.on('socketClose', async (code, reason) => {
      const msg = `${colorize.cyan}[WS CLOSE]${colorize.reset} code:${code} reason:${reason}`;
      await logMessage(msg, log.scope('WS').log.bind(log));
    });

    /** Handles 404 or unmatched routes. */
    server.on('not-found', async (req, res) => {
      const color = colorize.status(res.statusCode);
      const msg = `${color}[${res.statusCode}]${colorize.reset} ${req.method} ${req.url} (not found)`;
      await logMessage(msg, log.scope(req.method).warn.bind(log));
    });

    /** Handles general server errors and exceptions. */
    server.on('error', async (err) => {
      const msg = `[ERROR] ${err.stack || err.message}`;
      await logMessage(msg, log.error.bind(log));
    });
  };
}
