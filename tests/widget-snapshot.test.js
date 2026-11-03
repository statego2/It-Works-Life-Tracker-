import test from "node:test";
import assert from "node:assert/strict";
import { demoWorkspace, formatValue, getCurrent, getTarget } from "../src/domain.js";
import { goldWidgetSnapshot } from "../src/widget-snapshot.js";

test("gold widget snapshot keeps current on the left and target on the right", () => {
  const workspace = demoWorkspace();
  const snapshot = goldWidgetSnapshot(workspace);
  assert.equal(snapshot.goals.length, 2);
  for (const goal of snapshot.goals) {
    const metric = workspace.metrics.find((item) => item.title === goal.title);
    assert.equal(goal.current, formatValue(getCurrent(metric).value));
    assert.equal(goal.target, formatValue(getTarget(metric).value));
    assert.notEqual(goal.current, goal.target);
  }
  assert.equal(Object.keys(snapshot.goals[0])[1], "current");
  assert.equal(Object.keys(snapshot.goals[0])[2], "target");
});
