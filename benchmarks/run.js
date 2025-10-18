import autocannon from "autocannon";
import { spawn, execSync } from "child_process";

async function bench(file, port = 3000) {
  console.log(`\n🚀 Starting ${file}...`);
  const proc = spawn("node", [`servers/${file}`], { stdio: "inherit" });

  // Esperar a que el servidor arranque
  await new Promise(r => setTimeout(r, 1000));

  const result = await autocannon({
    url: `http://localhost:${port}`,
    connections: 100,
    duration: 5
  });

  console.log(`\n🛑 Stopping ${file}...`);
  try {
    // Cerrar proceso por PID (si aún existe)
    process.kill(proc.pid, "SIGTERM");
  } catch {}

  // Fuerza liberar el puerto si sigue ocupado
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9`);
  } catch {}

  return {
    server: file.replace(".js", ""),
    rps: result.requests.average,
    latency: result.latency.average
  };
}

const servers = ["express.js", "fastify.js", "hono.js", "synphony.js"];
const results = [];

for (const file of servers) {
  results.push(await bench(file));
}

console.table(results);
