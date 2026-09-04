/**
 * 按 package.json 的 version 打 annotated tag 并推送到 origin。
 * 同步 src-tauri 侧版本，避免安装包 / About / tag 不一致：
 *   - src-tauri/tauri.conf.json
 *   - src-tauri/Cargo.toml
 *   - src-tauri/Cargo.lock（package tauri-app）
 *
 * 用法：pnpm release:tag
 * 环境：RELEASE_TAG_SKIP_PUSH=1 只打本地 tag 不推送
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skipPush = process.env.RELEASE_TAG_SKIP_PUSH === "1";

const VERSION_FILES = [
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
];

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function writeJson(rel, data) {
  writeFileSync(join(root, rel), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitOk(...args) {
  try {
    git(...args);
    return true;
  } catch {
    return false;
  }
}

const pkg = readJson("package.json");
const version = String(pkg.version ?? "").trim();
if (!/^\d+\.\d+\.\d+([.-].+)?$/.test(version)) {
  console.error(`[release:tag] invalid package.json version: ${version}`);
  process.exit(1);
}

const tag = `v${version}`;
console.log(`[release:tag] version=${version} tag=${tag} (from package.json)`);

const synced = [];

const tauriPath = "src-tauri/tauri.conf.json";
const tauri = readJson(tauriPath);
if (tauri.version !== version) {
  tauri.version = version;
  writeJson(tauriPath, tauri);
  synced.push(tauriPath);
}

const cargoPath = "src-tauri/Cargo.toml";
const cargoRaw = readFileSync(join(root, cargoPath), "utf8");
const cargoNext = cargoRaw.replace(
  /^version\s*=\s*"[^"]*"/m,
  `version = "${version}"`,
);
if (cargoNext !== cargoRaw) {
  writeFileSync(join(root, cargoPath), cargoNext, "utf8");
  synced.push(cargoPath);
}

const lockPath = "src-tauri/Cargo.lock";
const lockRaw = readFileSync(join(root, lockPath), "utf8");
const lockNext = lockRaw.replace(
  /(name = "tauri-app"\r?\n)version = "[^"]*"/,
  `$1version = "${version}"`,
);
if (lockNext === lockRaw) {
  if (!/name = "tauri-app"\r?\nversion = /.test(lockRaw)) {
    console.error(
      `[release:tag] could not find package tauri-app in ${lockPath}`,
    );
    process.exit(1);
  }
} else {
  writeFileSync(join(root, lockPath), lockNext, "utf8");
  synced.push(lockPath);
}

for (const f of synced) {
  console.log(`[release:tag] synced ${f} → ${version}`);
}
if (synced.length === 0) {
  console.log("[release:tag] tauri / cargo versions already match package.json");
}

const dirty = git("status", "--porcelain");
if (dirty) {
  const bad = [];
  for (const line of dirty.split(/\r?\n/).filter(Boolean)) {
    // porcelain: "XY PATH" / "XY ORIG -> PATH"（XY 恰为两列）
    const m = /^(?:.|\s){2} (.+)$/.exec(line);
    let path = (m?.[1] ?? line.slice(3)).trim();
    const arrow = path.lastIndexOf(" -> ");
    if (arrow >= 0) path = path.slice(arrow + 4).trim();
    path = path.replace(/^"(.*)"$/, "$1").replace(/\\/g, "/");
    if (!VERSION_FILES.includes(path)) bad.push(`${JSON.stringify(line)} → ${path}`);
  }
  if (bad.length > 0) {
    console.error(
      "[release:tag] working tree has unrelated changes; commit or stash first:\n" +
        dirty +
        "\n[release:tag] unrecognized paths:\n" +
        bad.join("\n"),
    );
    process.exit(1);
  }
  git("add", ...VERSION_FILES);
  git("commit", "-m", `chore: bump version to ${version}`);
  console.log(`[release:tag] committed version bump`);
}

if (gitOk("rev-parse", "-q", "--verify", `refs/tags/${tag}`)) {
  console.error(`[release:tag] tag already exists locally: ${tag}`);
  process.exit(1);
}

git("tag", "-a", tag, "-m", `Lunark ${tag}`);
console.log(`[release:tag] created ${tag}`);

if (skipPush) {
  console.log("[release:tag] RELEASE_TAG_SKIP_PUSH=1 — skip push");
  process.exit(0);
}

git("push", "origin", "HEAD");
git("push", "origin", tag);
console.log(`[release:tag] pushed HEAD and ${tag} → origin`);
console.log(
  "[release:tag] CI release workflow should start: Actions → release",
);
