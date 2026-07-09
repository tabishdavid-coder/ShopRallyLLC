/**
 * Email Order Process Lab walkthrough video to the owner.
 *
 * Usage:
 *   node agents/OrderProcessLab/scripts/email-order-process-video.mjs
 *   node agents/OrderProcessLab/scripts/email-order-process-video.mjs --to=tabish.david@gmail.com
 *   node agents/OrderProcessLab/scripts/email-order-process-video.mjs --file=path/to/video.webm
 *
 * Env (optional — loaded from .env / .env.local):
 *   RESEND_API_KEY, EMAIL_FROM — live send via Resend (attachment ≤ ~40MB)
 *   ORDER_PROCESS_VIDEO_EMAIL — default recipient (fallback: tabish.david@gmail.com)
 */
import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAB_ROOT = path.join(__dirname, "..");
const OUT = path.join(LAB_ROOT, "output");

const DEFAULT_TO = "tabish.david@gmail.com";
const MAX_RESEND_BYTES = 40 * 1024 * 1024;

async function loadEnvFiles() {
  const root = path.join(LAB_ROOT, "../..");
  for (const name of [".env", ".env.local"]) {
    const p = path.join(root, name);
    try {
      const text = await readFile(p, "utf8");
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq === -1) continue;
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
    } catch {
      /* missing file */
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const toArg = args.find((a) => a.startsWith("--to="));
  const fileArg = args.find((a) => a.startsWith("--file="));
  return {
    to: toArg?.split("=")[1] ?? process.env.ORDER_PROCESS_VIDEO_EMAIL ?? DEFAULT_TO,
    file: fileArg?.split("=")[1],
  };
}

async function findLatestVideo() {
  let entries;
  try {
    entries = await readdir(OUT);
  } catch {
    throw new Error(`No output folder at ${OUT}. Run record-order-process.mjs first.`);
  }
  const videos = entries.filter(
    (f) => f.startsWith("order-process-walkthrough-") && (f.endsWith(".webm") || f.endsWith(".mp4")),
  );
  if (!videos.length) {
    throw new Error("No order-process-walkthrough-*.webm in output/. Record the video first.");
  }
  const withStat = await Promise.all(
    videos.map(async (f) => ({ f, s: await stat(path.join(OUT, f)) })),
  );
  withStat.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
  return path.join(OUT, withStat[0].f);
}

async function readVideoNotes() {
  try {
    return await readFile(path.join(LAB_ROOT, "VIDEO-NOTES.md"), "utf8");
  } catch {
    return "";
  }
}

function buildEmailBody(videoPath, notes) {
  const name = path.basename(videoPath);
  const summary = notes.trim() ? `\n\n--- Video notes ---\n${notes.trim()}\n` : "";
  return (
    `Order Process Lab walkthrough is ready for review.\n\n` +
    `Video: ${name}\n` +
    `Recorded from Dev 3004 — intake through first estimate job.\n\n` +
    `Spec: agents/OrderProcessLab/ULTIMATE-ORDER-PROCESS-SPEC.md\n` +
    `Full index: agents/OrderProcessLab/OUTPUT.md` +
    summary
  );
}

async function sendViaResend({ to, from, apiKey, videoPath, subject, text }) {
  const buf = await readFile(videoPath);
  if (buf.length > MAX_RESEND_BYTES) {
    throw new Error(
      `Video is ${(buf.length / 1024 / 1024).toFixed(1)}MB — Resend limit ~40MB. Compress or use EML fallback.`,
    );
  }
  const contentType = videoPath.endsWith(".mp4") ? "video/mp4" : "video/webm";
  const payload = {
    from,
    to,
    subject,
    text,
    attachments: [
      {
        filename: path.basename(videoPath),
        content: buf.toString("base64"),
        content_type: contentType,
      },
    ],
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  });
  const json = await res.json();
  if (!res.ok || !json.id) {
    throw new Error(json.message ?? json.name ?? `Resend failed (${res.status})`);
  }
  return json.id;
}

async function writeEmlFallback({ to, from, videoPath, subject, text }) {
  const buf = await readFile(videoPath);
  const boundary = `----ShopRallyOrderProcess_${Date.now()}`;
  const b64 = buf.toString("base64");
  const wrapped = b64.replace(/.{1,76}/g, "$&\n").trim();
  const contentType = videoPath.endsWith(".mp4") ? "video/mp4" : "video/webm";
  const eml =
    `From: ${from}\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: multipart/mixed; boundary="${boundary}"\r\n` +
    `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n` +
    `\r\n` +
    `${text.replace(/\n/g, "\r\n")}\r\n` +
    `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${contentType}; name="${path.basename(videoPath)}"\r\n` +
    `Content-Transfer-Encoding: base64\r\n` +
    `Content-Disposition: attachment; filename="${path.basename(videoPath)}"\r\n` +
    `\r\n` +
    `${wrapped}\r\n` +
    `\r\n` +
    `--${boundary}--\r\n`;

  const emlPath = path.join(OUT, `email-to-${to.replace(/@/g, "-at-")}.eml`);
  await writeFile(emlPath, eml, "utf8");
  return emlPath;
}

async function sendViaOutlook({ to, videoPath, subject, text }) {
  if (process.platform !== "win32") {
    throw new Error("Outlook send is Windows-only");
  }
  const { spawnSync } = await import("node:child_process");
  const psScript = path.join(__dirname, "send-via-outlook.ps1");
  const r = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      psScript,
      "-To",
      to,
      "-VideoPath",
      videoPath,
      "-Subject",
      subject,
      "-Body",
      text,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || r.stdout?.trim() || "Outlook send failed");
  }
  return true;
}

async function main() {
  await loadEnvFiles();
  const { to, file } = parseArgs();
  const videoPath = file ? path.resolve(file) : await findLatestVideo();
  const notes = await readVideoNotes();
  const subject = "ShopRally Order Process Lab — intake → estimate walkthrough";
  const text = buildEmailBody(videoPath, notes);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "ShopRally Order Process Lab <onboarding@resend.dev>";
  const stamp = new Date().toISOString();

  const manifest = {
    at: stamp,
    to,
    video: videoPath,
    method: null,
    resendId: null,
    emlPath: null,
    error: null,
  };

  if (apiKey && process.env.EMAIL_FROM?.trim()) {
    try {
      const id = await sendViaResend({ to, from: process.env.EMAIL_FROM.trim(), apiKey, videoPath, subject, text });
      manifest.method = "resend";
      manifest.resendId = id;
      console.log(`✅ Email sent via Resend to ${to} (id: ${id})`);
    } catch (err) {
      manifest.error = String(err.message);
      console.warn(`Resend failed: ${err.message}`);
    }
  } else if (apiKey) {
    try {
      const id = await sendViaResend({ to, from, apiKey, videoPath, subject, text });
      manifest.method = "resend-onboarding";
      manifest.resendId = id;
      console.log(`✅ Email sent via Resend (onboarding from) to ${to} (id: ${id})`);
    } catch (err) {
      manifest.error = String(err.message);
      console.warn(`Resend failed: ${err.message}`);
    }
  } else {
    console.log("RESEND_API_KEY not set — trying Outlook…");
    try {
      await sendViaOutlook({ to, videoPath, subject, text });
      manifest.method = "outlook";
      console.log(`✅ Email sent via Outlook to ${to}`);
    } catch (err) {
      manifest.error = String(err.message);
      console.warn(`Outlook send failed: ${err.message}`);
    }
  }

  if (!manifest.resendId && manifest.method !== "outlook") {
    const emlPath = await writeEmlFallback({ to, from: from.replace(/<[^>]+>/, "").trim() || "karvio@local", videoPath, subject, text });
    manifest.method = manifest.method ?? "eml-fallback";
    manifest.emlPath = emlPath;
    console.log(`📧 EML draft with attachment: ${emlPath}`);
    console.log(`   Open in Outlook / Mail, verify To: ${to}, click Send.`);

    if (process.platform === "win32") {
      const { spawnSync } = await import("node:child_process");
      const openScript = path.join(__dirname, "open-email-draft.ps1");
      spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", openScript, "-EmlPath", emlPath], {
        stdio: "inherit",
      });
    }

    console.log(`   Or set RESEND_API_KEY + EMAIL_FROM in .env for automatic send.`);
  }

  const manifestPath = path.join(OUT, "email-delivery-manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
