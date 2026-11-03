import test from "node:test";
import assert from "node:assert/strict";
import { demoWorkspace, emptyWorkspace } from "../src/domain.js";
import { makeBackup, parseBackup, validateWorkspace } from "../src/backup.js";
import { demoNarrative, moveAffirmation, normalizeAppearance, orderedAffirmations } from "../src/appearance.js";

test("an old backup without identity copy still restores", () => {
  const legacy = emptyWorkspace();
  legacy.areas = [];
  const restored = parseBackup(JSON.stringify(legacy));
  assert.equal(restored.affirmations.length, 0);
  assert.equal(restored.identity.sections.map((section) => section.key).join(","), "ideal,work,mission,personal");
  assert.equal(restored.appearance.direction, "sanctuary");
  assert.equal(restored.appearance.scheme, "dark");
  assert.equal(restored.areas.length, 0);
});

test("demo narrative keeps affirmation order, chips, and survives a backup round trip", () => {
  const original = demoWorkspace();
  const story = demoNarrative();
  original.affirmations = story.affirmations;
  original.identity = story.identity;
  assert.deepEqual(orderedAffirmations(original).map((item) => item.order), [0, 1, 2, 3]);
  assert.equal(original.identity.sections[1].chips.length, 3);
  const restored = parseBackup(JSON.stringify(makeBackup(original)));
  assert.deepEqual(restored.affirmations.map((item) => item.text), original.affirmations.map((item) => item.text));
  assert.equal(restored.identity.sections[1].chips[0].label, "Γράψιμο");
  assert.equal(restored.metrics[0].observations.length, 1);
});

test("affirmation order can change without dropping text, and broken rows are ignored", () => {
  const story = demoNarrative();
  const state = validateWorkspace({...demoWorkspace(), affirmations: story.affirmations, identity: story.identity});
  const first = state.affirmations[0].text;
  const second = state.affirmations[1].text;
  assert.equal(moveAffirmation(state, state.affirmations[1].id, -1), true);
  assert.equal(orderedAffirmations(state)[0].text, second);
  assert.equal(orderedAffirmations(state)[1].text, first);
  normalizeAppearance(state);
  state.affirmations.push({ id: state.affirmations[0].id, text: "Διπλό", order: 9 });
  state.affirmations.push({ id: "blank", text: "   ", order: 10 });
  normalizeAppearance(state);
  assert.equal(state.affirmations.some((item) => item.text === "Διπλό"), false);
  assert.equal(state.affirmations.some((item) => item.id === "blank"), false);
  assert.equal(validateWorkspace(state).affirmations.length, 4);
});
