import test from "node:test";
import assert from "node:assert/strict";
import { demoWorkspace } from "../src/domain.js";
import { commitWorkspace, SAVE_ROLLBACK_MESSAGE } from "../src/persist.js";
import { saveWorkspace } from "../src/storage.js";

test("failed save rolls the visible workspace back to the last saved copy", () => {
  const saved = demoWorkspace();
  const attempted = structuredClone(saved);
  attempted.areas[0].name = "Άλλαξε προσωρινά";
  const result = commitWorkspace(attempted, saved, () => false);
  assert.equal(result.ok, false);
  assert.equal(result.workspace.areas[0].name, saved.areas[0].name);
  assert.notEqual(result.workspace, saved);
  assert.equal(result.workspace.metrics.length, saved.metrics.length);
  assert.equal(result.message, SAVE_ROLLBACK_MESSAGE);
  assert.match(result.message, /Δεν αποθηκεύτηκε/);
  assert.match(result.message, /τελευταία αποθηκευμένη/);
});

test("a thrown save is treated as a failed save", () => {
  const saved = demoWorkspace();
  const attempted = structuredClone(saved);
  attempted.purpose = { text: "Νέο κείμενο", visible: true };
  const result = commitWorkspace(attempted, saved, () => { throw new Error("quota"); });
  assert.equal(result.ok, false);
  assert.equal(result.workspace.purpose.text, saved.purpose.text);
});

test("successful save keeps the attempted workspace", () => {
  const saved = demoWorkspace();
  const attempted = structuredClone(saved);
  attempted.areas[0].name = "Κράτησε αυτό";
  let seen = null;
  const result = commitWorkspace(attempted, saved, (value) => { seen = value; return true; });
  assert.equal(result.ok, true);
  assert.equal(result.message, null);
  assert.equal(result.workspace.areas[0].name, "Κράτησε αυτό");
  assert.equal(seen, attempted);
  result.workspace.areas[0].name = "Μην αγγίξεις το αποθηκευμένο";
  assert.equal(attempted.areas[0].name, "Κράτησε αυτό");
});

test("quota failure keeps the previously stored workspace", () => {
  const store = new Map();
  let fail = false;
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        if (fail) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        store.set(key, value);
      },
    },
  };
  const saved = demoWorkspace();
  assert.equal(saveWorkspace(saved), true);
  const attempted = structuredClone(saved);
  attempted.purpose = { text: "Δεν πρέπει να μείνει στην οθόνη", visible: true };
  fail = true;
  const result = commitWorkspace(attempted, saved, saveWorkspace);
  assert.equal(result.ok, false);
  assert.equal(result.workspace.purpose.text, saved.purpose.text);
  assert.match(result.message, /Vision Board/);
  const stored = JSON.parse(store.get("it-works:local-preview:v1"));
  assert.equal(stored.purpose.text, saved.purpose.text);
  assert.equal(stored.areas[0].name, saved.areas[0].name);
});
