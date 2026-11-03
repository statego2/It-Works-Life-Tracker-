import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleSite, auditSite } from "../scripts/site-artifact.js";

test("the assembled site contains every file the app requests", () => {
  const dest = assembleSite(undefined, mkdtempSync(join(tmpdir(), "itworks-site-")));
  try {
    assert.deepEqual(auditSite(dest), []);
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
});

test("a missing imported module fails the deploy check", () => {
  const dest = assembleSite(undefined, mkdtempSync(join(tmpdir(), "itworks-missing-")));
  try {
    rmSync(join(dest, "src", "backup.js"));
    const problems = auditSite(dest);
    assert.ok(problems.some((problem) => problem.includes("src/backup.js")));
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
});

test("a file left out of the service worker cache fails the deploy check", () => {
  const dest = assembleSite(undefined, mkdtempSync(join(tmpdir(), "itworks-cache-")));
  try {
    const swPath = join(dest, "sw.js");
    const source = readFileSync(swPath, "utf8").replace("'./src/vision.js?v=20261103-opal-v13',", "");
    writeFileSync(swPath, source);
    const problems = auditSite(dest);
    assert.ok(problems.some((problem) => problem.includes("not cached") && problem.includes("vision.js")));
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
});
