/**
 * Upload latest Order Process video to catbox + tmpfiles; write remote-view-link.json
 */
import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "output");

async function findLatestVideo(fileArg) {
  if (fileArg) return path.resolve(fileArg);
  const entries = await readdir(OUT);
  const videos = entries.filter(
    (f) => f.startsWith("order-process-walkthrough-") && f.endsWith(".webm"),
  );
  if (!videos.length) throw new Error("No walkthrough video in output/");
  const withStat = await Promise.all(videos.map(async (f) => ({ f, s: await stat(path.join(OUT, f)) })));
  withStat.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
  return path.join(OUT, withStat[0].f);
}

async function uploadCatbox(videoPath) {
  const r = spawnSync(
    "curl.exe",
    [
      "-sS",
      "-F",
      "reqtype=fileupload",
      "-F",
      "time=72h",
      "-F",
      `fileToUpload=@${videoPath.replace(/\\/g, "/")}`,
      "https://catbox.moe/user/api.php",
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  const url = (r.stdout || "").trim();
  if (!url.startsWith("https://")) throw new Error(`catbox failed: ${r.stderr || r.stdout}`);
  return url;
}

async function uploadTmpfiles(videoPath) {
  const r = spawnSync(
    "curl.exe",
    [
      "-sS",
      "-X",
      "POST",
      "-F",
      `file=@${videoPath.replace(/\\/g, "/")}`,
      "https://tmpfiles.org/api/v1/upload",
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  const json = JSON.parse(r.stdout || "{}");
  const pageUrl = json?.data?.url;
  if (!pageUrl) throw new Error(`tmpfiles failed: ${r.stdout}`);
  const id = pageUrl.split("/")[3];
  const name = path.basename(videoPath).toLowerCase();
  return {
    viewPage: pageUrl,
    download: `https://tmpfiles.org/dl/${id}/${name}`,
  };
}

async function main() {
  const fileArg = process.argv.find((a) => a.startsWith("--file="))?.split("=")[1];
  const videoPath = await findLatestVideo(fileArg);
  const sizeBytes = (await stat(videoPath)).size;

  console.log(`Uploading ${path.basename(videoPath)} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)…`);

  const catboxUrl = await uploadCatbox(videoPath);
  let tmp = null;
  try {
    tmp = await uploadTmpfiles(videoPath);
  } catch (e) {
    console.warn("tmpfiles backup skipped:", e.message);
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    video: path.basename(videoPath),
    sizeBytes,
    links: {
      viewDirect: catboxUrl,
      ...(tmp ? { viewPage: tmp.viewPage, download: tmp.download } : {}),
    },
  };

  const manifestPath = path.join(OUT, "remote-view-link.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log("\n=== Remote view link ===");
  console.log(catboxUrl);
  if (tmp) console.log(`Backup: ${tmp.viewPage}`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
