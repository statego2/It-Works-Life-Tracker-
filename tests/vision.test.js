import test from "node:test";
import assert from "node:assert/strict";
import { fittedSize, VISION_DATA_URL_LIMIT } from "../src/vision.js";

test("vision photos are scaled down and kept under the storage budget", () => {
  assert.deepEqual(fittedSize(4000, 2000, 720), { width: 720, height: 360 });
  assert.deepEqual(fittedSize(800, 1600, 720), { width: 360, height: 720 });
  assert.deepEqual(fittedSize(100, 80, 720), { width: 100, height: 80 });
  assert.ok(VISION_DATA_URL_LIMIT <= 120_000);
  assert.ok(VISION_DATA_URL_LIMIT < 260_000);
});

test("fittedSize rejects empty dimensions", () => {
  assert.throws(() => fittedSize(0, 10, 720));
  assert.throws(() => fittedSize(10, 10, 0));
});
