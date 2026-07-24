/**
 * Start Prisma Dev (shoprally) for local CRM work.
 * Handles zombie state: stale PID in server.json but port dead → rm + recreate.
 *
 * Usage: npm run db:dev
 * Fixed ports: API 51213, TCP 51214, shadow 51215 (matches .env DATABASE_URL).
 */
import { execSync } from "node:child_process";
import net from "node:net";

const NAME = "shoprally";
const API_PORT = 51213;
const DB_PORT = 51214;
const SHADOW_PORT = 51215;

const DEV_URL = `postgresql://postgres:postgres@localhost:${DB_PORT}/template1?sslmode=disable&pgbouncer=true&connection_limit=1`;

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function prisma(args, inherit = false) {
  return execSync(`npx prisma dev ${args}`, {
    encoding: "utf8",
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  }).trim();
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port, timeout: 1500 });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, label, maxMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await portOpen(port)) {
      console.log(`[db:dev] ${label} ready on port ${port}`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(`[db:dev] Timed out waiting for ${label} on port ${port}`);
  return false;
}

function isListedRunning() {
  try {
    const out = prisma("ls");
    return out.split(/\r?\n/).some((l) => l.includes(NAME) && !l.includes("not_running"));
  } catch {
    return false;
  }
}

async function main() {
  const listed = isListedRunning();
  const portUp = await portOpen(DB_PORT);

  if (listed && portUp) {
    console.log(`[db:dev] Prisma Dev "${NAME}" already running on TCP ${DB_PORT}`);
    console.log(`[db:dev] DATABASE_URL=${DEV_URL}`);
    return;
  }

  if (listed && !portUp) {
    console.log(`[db:dev] Zombie detected (listed running but port ${DB_PORT} closed). Cleaning up…`);
    try {
      prisma(`stop ${NAME}`);
    } catch {
      /* may already be dead */
    }
    try {
      prisma(`rm ${NAME}`);
    } catch {
      /* best effort */
    }
  }

  console.log(`[db:dev] Starting Prisma Dev "${NAME}" (ports ${API_PORT}/${DB_PORT}/${SHADOW_PORT})…`);
  console.log(`[db:dev] Leave this terminal open — Prisma Dev must stay running.`);
  console.log(`[db:dev] Or run in background: npx prisma dev -n ${NAME} -p ${API_PORT} --db-port ${DB_PORT} --shadow-db-port ${SHADOW_PORT}`);
  prisma(`-n ${NAME} -p ${API_PORT} --db-port ${DB_PORT} --shadow-db-port ${SHADOW_PORT}`, true);

  const ready = await waitForPort(DB_PORT, "PostgreSQL TCP");
  if (!ready) process.exit(1);

  console.log("");
  console.log("[db:dev] Prisma Dev is ready.");
  console.log(`[db:dev] DATABASE_URL=${DEV_URL}`);
  console.log("[db:dev] Next: npm run dev  →  http://localhost:3031");
}

main().catch((err) => {
  console.error("[db:dev]", err.message ?? err);
  process.exit(1);
});
