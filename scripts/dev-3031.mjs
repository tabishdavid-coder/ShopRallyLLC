import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * ShopRally CRM Dev 3031 — canonical shop CRM (`npm run dev`).
 * AutopilotShell + Tekmetric IA nav + jobs layout toggle (inline vs Tekmetric tables).
 */
const PORT = 3031;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const env = {
  ...process.env,
  APP_URL: process.env.APP_URL ?? `http://localhost:${PORT}`,
  NEXT_PUBLIC_AP_SHELL: "3030",
  NEXT_PUBLIC_SHOPRALLY_DESIGN_MODE: "0",
  NEXT_PUBLIC_DEV_PORT: String(PORT),
};

function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes("LISTENING")) continue;
        const pid = line.trim().split(/\s+/).at(-1);
        if (pid && /^\d+$/.test(pid)) pids.add(pid);
      }
      for (const pid of pids) {
        console.log(`[dev] Stopping stale process on port ${port} (PID ${pid})`);
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      }
      return;
    }

    execSync(`fuser -k ${port}/tcp 2>/dev/null || lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
      shell: true,
      stdio: "ignore",
    });
  } catch {
    // Port already free.
  }
}

freePort(PORT);

console.log(`[dev] ShopRally CRM — http://localhost:${PORT}`);
console.log(`[dev] Tip: keep ONE browser tab open — extra tabs exhaust the Neon pool.`);

const child = spawn(process.execPath, [nextCli, "dev", "-p", String(PORT)], {
  stdio: "inherit",
  env,
  cwd: projectRoot,
});

child.on("exit", (code) => process.exit(code ?? 0));
