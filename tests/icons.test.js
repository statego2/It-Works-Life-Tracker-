import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function pngSize(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test("home-screen icons are real PNGs at the sizes iOS and the manifest need", () => {
  assert.deepEqual(pngSize("icons/apple-touch-icon.png"), { width: 180, height: 180 });
  assert.deepEqual(pngSize("icons/icon-192.png"), { width: 192, height: 192 });
  assert.deepEqual(pngSize("icons/icon-512.png"), { width: 512, height: 512 });
  assert.deepEqual(pngSize("icons/icon-maskable-192.png"), { width: 192, height: 192 });
  assert.deepEqual(pngSize("icons/icon-maskable-512.png"), { width: 512, height: 512 });
});
