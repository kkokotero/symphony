import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import autocannon from "autocannon";

async function bench(file, port = 3000) {
  console.log(`Starting benchmark for: ${file}`);

  const proc = spawn("node", [`servers/${file}`], {
    stdio: "ignore",
  });

  await new Promise((r) => setTimeout(r, 1500));

  const start = performance.now();
  const result = await autocannon({
    url: `http://localhost:${port}`,
    connections: 100,
    duration: 10,
    pipelining: 1,
  });
  const end = performance.now();

  try {
    process.kill(proc.pid, "SIGTERM");
  } catch {}

  const elapsed = ((end - start) / 1000).toFixed(2);

  return {
    server: file.replace(".js", ""),
    duration: `${elapsed}s`,
    requests: result.requests.total,
    rpsAvg: result.requests.average.toFixed(2),
    rpsMax: result.requests.max,
    latencyAvg: result.latency.average.toFixed(2),
    latencyMax: result.latency.max,
    throughput: `${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`,
    errors: result.errors,
    timeouts: result.timeouts,
  };
}

const servers = ["synphony.js", "koa.js", "polka.js", "express.js", "fastify.js", "hono.js"];
const results = [];

for (const file of servers) {
  const res = await bench(file);
  results.push(res);
}

console.table(results);
