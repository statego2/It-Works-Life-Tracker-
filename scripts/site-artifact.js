import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://app.example/";

export function assembleSite(root = resolve(dirname(fileURLToPath(import.meta.url)), ".."), dest = resolve(root, "_site")) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(resolve(dest, "src"), { recursive: true });
  mkdirSync(resolve(dest, "icons"), { recursive: true });
  for (const file of ["index.html", "styles.css", "manifest.webmanifest", "sw.js"]) {
    cpSync(resolve(root, file), resolve(dest, file));
  }
  cpSync(resolve(root, "src"), resolve(dest, "src"), { recursive: true });
  cpSync(resolve(root, "icons"), resolve(dest, "icons"), { recursive: true });
  writeFileSync(resolve(dest, ".nojekyll"), "");
  return dest;
}

function localRef(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("mailto:")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  if (!(trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith("/"))) return null;
  return trimmed;
}

export function localRefs(text, ext) {
  const found = [];
  const push = (value) => {
    const ref = localRef(value);
    if (ref) found.push(ref);
  };
  if (ext === ".html") {
    for (const match of text.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) push(match[1]);
  } else if (ext === ".js") {
    for (const match of text.matchAll(/\bfrom\s*["']([^"']+)["']/g)) push(match[1]);
    for (const match of text.matchAll(/\bimport\s*["']([^"']+)["']/g)) push(match[1]);
    for (const match of text.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) push(match[1]);
    for (const match of text.matchAll(/["'](\.{1,2}\/[^"']*)["']/g)) push(match[1]);
  } else if (ext === ".css") {
    for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) push(match[1]);
  } else if (ext === ".webmanifest" || ext === ".json") {
    const walk = (value) => {
      if (typeof value === "string") push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") Object.values(value).forEach(walk);
    };
    walk(JSON.parse(text));
  }
  return found;
}

function locate(siteDir, url) {
  const siteRoot = resolve(siteDir);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") return { ok: true, directory: true, relative: "" };
  if (pathname.startsWith("/")) pathname = pathname.slice(1);
  const full = resolve(siteRoot, pathname);
  if (full !== siteRoot && !full.startsWith(siteRoot + sep)) return { ok: false, relative: pathname };
  if (!existsSync(full)) return { ok: false, relative: pathname };
  return { ok: true, directory: statSync(full).isDirectory(), full, relative: pathname };
}

function identity(url) {
  return `${url.pathname}${url.search}`;
}

/**
 * Returns human-readable problems. Empty means every URL the app shell requests
 * exists in the artifact and is listed in the service worker cache (except sw.js itself).
 */
export function auditSite(siteDir) {
  const problems = [];
  const queue = [new URL("index.html", ORIGIN)];
  const seen = new Set();
  const required = new Set();
  while (queue.length) {
    const url = queue.pop();
    const key = url.href;
    if (seen.has(key)) continue;
    seen.add(key);
    const place = locate(siteDir, url);
    if (!place.ok) {
      problems.push(`missing file ${place.relative} (requested as ${identity(url)})`);
      continue;
    }
    if (!url.pathname.endsWith("/sw.js")) required.add(identity(url));
    if (place.directory) continue;
    const ext = extname(place.full);
    if (![".html", ".js", ".css", ".webmanifest", ".json"].includes(ext)) continue;
    let text;
    try { text = readFileSync(place.full, "utf8"); }
    catch { problems.push(`unreadable ${place.relative}`); continue; }
    let refs = [];
    try { refs = localRefs(text, ext); }
    catch (error) { problems.push(`could not read references in ${place.relative}: ${error.message}`); continue; }
    for (const ref of refs) queue.push(new URL(ref, url));
  }
  const swUrl = new URL("sw.js", ORIGIN);
  const swPlace = locate(siteDir, swUrl);
  if (!swPlace.ok) return problems;
  const cached = new Set(localRefs(readFileSync(swPlace.full, "utf8"), ".js").map((ref) => identity(new URL(ref, swUrl))));
  for (const asset of cached) {
    const place = locate(siteDir, new URL(asset, ORIGIN));
    if (!place.ok) problems.push(`service worker lists missing file ${place.relative} (${asset})`);
  }
  for (const asset of required) {
    if (!cached.has(asset)) problems.push(`not cached ${asset}`);
  }
  return problems;
}
