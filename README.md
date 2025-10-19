![Synphony Logo](./misc/banner.svg)

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/kkokotero/synphony/build-and-test.yml)](https://github.com/kkokotero/synphony/actions)
[![Stars](https://img.shields.io/github/stars/kkokotero/synphony?style=social)](https://github.com/kkokotero/synphony)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/kkokotero/synphony)](https://github.com/kkokotero/synphony/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/kkokotero/synphony)](https://github.com/kkokotero/synphony/commits/main)
[![npm version](https://img.shields.io/npm/v/synphony.svg)](https://www.npmjs.com/package/synphony)
[![npm downloads](https://img.shields.io/npm/dm/synphony)](https://www.npmjs.com/package/synphony)
[![Bundle Size](https://img.shields.io/bundlephobia/min/synphony)](https://bundlephobia.com/result?p=synphony)
[![Bundle Size (gzip)](https://img.shields.io/bundlephobia/minzip/synphony)](https://bundlephobia.com/result?p=synphony)

> **The synphony between HTTP and WebSocket, written in TypeScript.**
> A unified, modular, and frictionless framework.

---

**Synphony** outperforms **Koa by 44%**, **Hono by 42%**, **Express by 302%**, and stays slightly ahead of **Fastify by 3%**, demonstrating that it combines speed and stability at the highest level. 

**Synphony** is a **TypeScript** framework for creating **HTTP** and **WebSocket** servers under a single API.
Designed to be **lightweight, modular, and expressive**, Synphony doesn’t hide complexity — it organizes it.

Its architecture lets you **extend, replace, or create modules** without breaking the simplicity of the design.
Total control, natural performance, and a modern developer experience.

---

## Philosophy

Synphony doesn’t try to hide complexity — it arranges it.
It doesn’t lock you into its structure — it lets you compose your own.
Every module, every request, every connection… flows to the same rhythm.

Minimalism without limits. Efficiency without friction. Freedom without compromise.

---

## Installation

Install **Synphony** using npm:

```bash
npm install synphony
```

> Requires **Node.js v18** or higher.

---

## Features

* **Unified HTTP + WS:** handle requests and sockets under one API and context.
* **Modular architecture:** every part of the system can be extended, replaced, or disabled.
* **Native plugins:** extend the core without losing performance.
* **Total control:** direct access to the core, routes, connections, and low-level events.
* **Shared context:** HTTP and WS can interact and share data seamlessly.
* **Lightweight and expressive:** no unnecessary configuration or redundant layers.
* **Written in TypeScript:** strong typing, modern DX, and full ESM compatibility.
* **Efficiency by design:** optimized performance from the core, without hacks or heavy dependencies.

---

## Quick Start

You can find more examples in [examples](./examples).

### Unified example (HTTP + WS)

```ts
import { Server } from 'synphony/http';

const app = new Server();

app.get('/', (req, res) => {
  res.send('Hello from HTTP!');
});

app.ws('/chat', (socket) => {
  socket.send('Welcome to the chat!');
  socket.on('message', (msg) => socket.send(`Echo: ${msg}`));
});

app.listen(3000, () => {
  console.log(`Server running at ${app.address.url}`);
});
```

### Simple HTTP server

```ts
import { Server } from 'synphony/http';

const server = new Server();

server.get('/', (req, res) => {
  res.send('Hello, World!');
});

server.listen(3000, () => {
  console.log(`Server running on ${server.address.url}`);
});
```

### Simple WebSocket server

```ts
import { WebSocketServer } from 'synphony/ws';

const wss = new WebSocketServer();

wss.on('connection', (socket) => {
  socket.send('Hello, World!');
  socket.on('message', () => socket.send('I got your message!'));
});

wss.listen(8080, () => {
  console.log(`WebSocket server running on ${wss.address.url}`);
});
```

---

## Contributing

Got ideas, improvements, or found a bug? Contributions are welcome!
Here’s how to get started:

1. Check the open [issues](https://github.com/kkokotero/synphony/issues).
2. Fork the repository.
3. Create a branch for your change:

   ```bash
   git checkout -b feature/my-change
   ```
4. Make your changes and commit them:

   ```bash
   git commit -m "feat: add new feature"
   ```
5. Push and open a **Pull Request**.

See the [contribution guide](./CONTRIBUTING.md) for more details.

---

## Contributors

Thanks to these amazing people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

## Manifesto

Read the [Synphony Manifesto](./MANIFESTO.md) and discover the philosophy behind the code.
