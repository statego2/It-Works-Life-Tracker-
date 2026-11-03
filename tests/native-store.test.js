import test from "node:test";
import assert from "node:assert/strict";
import { demoWorkspace, normalizeMetricOrders } from "../src/domain.js";
import { makeBackup } from "../src/backup.js";
import { recordFromBackup, selectInitialRecord } from "../src/native-store.js";
import { initStorage, isNativeStore, loadWorkspace, saveWorkspace } from "../src/storage.js";

test("native data is kept when this browser also has localStorage", () => {
  const choice = selectInitialRecord({ nativeText: "{\"version\":1}", localText: "{\"version\":1,\"areas\":[]}" });
  assert.equal(choice.source, "native");
  assert.equal(choice.text, "{\"version\":1}");
});

test("localStorage is copied only when the native file is missing", () => {
  const choice = selectInitialRecord({ nativeText: null, localText: "{\"ok\":true}" });
  assert.equal(choice.source, "localStorage");
  assert.equal(selectInitialRecord({ nativeText: "   ", localText: "" }).source, "empty");
});

test("a JSON backup becomes the stored workspace, legacy or envelope", () => {
  const original = demoWorkspace();
  normalizeMetricOrders(original);
  const fromEnvelope = JSON.parse(recordFromBackup(JSON.stringify(makeBackup(original))));
  assert.equal(fromEnvelope.metrics.length, original.metrics.length);
  assert.equal(fromEnvelope.metrics[0].observations.length, 1);
  const legacy = JSON.parse(recordFromBackup(JSON.stringify(original)));
  assert.equal(legacy.areas.length, original.areas.length);
  assert.throws(() => recordFromBackup("{"));
});

test("the website still saves and loads through localStorage", async () => {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
    },
  };
  await initStorage();
  assert.equal(isNativeStore(), false);
  const workspace = demoWorkspace();
  assert.equal(saveWorkspace(workspace), true);
  assert.equal(loadWorkspace().areas.length, workspace.areas.length);
  assert.equal(store.has("it-works:local-preview:v1"), true);
});

test("iOS init copies localStorage once and later saves go to the file bridge", async () => {
  const files = new Map();
  const local = new Map();
  const existing = demoWorkspace();
  local.set("it-works:local-preview:v1", JSON.stringify(existing));
  globalThis.window = {
    localStorage: {
      getItem: (key) => (local.has(key) ? local.get(key) : null),
      setItem: (key, value) => local.set(key, value),
    },
    Capacitor: {
      isNativePlatform: () => true,
      nativePromise: async (plugin, method, options) => {
        assert.equal(plugin, "Filesystem");
        if (method === "readFile") {
          if (!files.has(options.path)) throw new Error("missing");
          return { data: files.get(options.path) };
        }
        if (method === "writeFile") {
          files.set(options.path, options.data);
          return {};
        }
        throw new Error(method);
      },
    },
  };
  await initStorage();
  assert.equal(isNativeStore(), true);
  assert.equal(JSON.parse(files.get("it-works/workspace.json")).areas.length, existing.areas.length);
  const renamed = loadWorkspace();
  renamed.areas[0].name = "Μετά τη μεταφορά";
  assert.equal(await saveWorkspace(renamed), true);
  assert.equal(JSON.parse(files.get("it-works/workspace.json")).areas[0].name, "Μετά τη μεταφορά");
  assert.equal(JSON.parse(local.get("it-works:local-preview:v1")).areas[0].name, existing.areas[0].name);
  await initStorage();
  assert.equal(loadWorkspace().areas[0].name, "Μετά τη μεταφορά");
});
