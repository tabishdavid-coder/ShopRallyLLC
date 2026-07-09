import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Legacy ShopRallyCRM Dev 3004 — AutopilotShell + design mode overlay.
 * Canonical dev moved to :3031 (`npm run dev`). Use only for comparison.
 */
const PORT = 3004;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const env = {
  ...process.env,
  NEXT_PUBLIC_AP_SHELL: "3030",
  NEXT_PUBLIC_SHOPRALLY_DESIGN_MODE: process.env.NEXT_PUBLIC_SHOPRALLY_DESIGN_MODE ?? "1",
};

/** Stop any stale listener so restarts don't hit EADDRINUSE. */
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
        console.log(`[dev:3004] Stopping stale process on port ${port} (PID ${pid})`);
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      }
      return;
    }

    execSync(`fuser -k ${port}/tcp 2>/dev/null || lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
      shell: true,
      stdio: "ignore",
    });
  } catch {
    // Port already free — nothing to do.
  }
}

freePort(PORT);

const child = spawn(process.execPath, [nextCli, "dev", "-p", String(PORT)], {
  stdio: "inherit",
  env,
  cwd: projectRoot,
});

child.on("exit", (code) => process.exit(code ?? 0));
