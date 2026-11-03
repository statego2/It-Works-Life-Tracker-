import test from "node:test";
import assert from "node:assert/strict";
import { applyReminderSchedule, canScheduleNatively, nextNotificationId, reminderFromInput, sanitizeReminders, schedulePayload } from "../src/reminders.js";

test("daily reminder payload is local and repeats", () => {
  const reminder = reminderFromInput({ id: "r1", text: "  Κοίτα τους στόχους  ", hour: 9, minute: 5, notificationId: 1 });
  assert.equal(reminder.text, "Κοίτα τους στόχους");
  const payload = schedulePayload([reminder]);
  assert.equal(payload.notifications[0].title, "It Works");
  assert.deepEqual(payload.notifications[0].schedule, { on: { hour: 9, minute: 5 }, repeats: true });
  assert.throws(() => reminderFromInput({ id: "r2", text: "", hour: 9, minute: 0, notificationId: 2 }));
});

test("broken reminder records are dropped and ids stay unique", () => {
  const clean = sanitizeReminders([
    { id: "a", text: "Πρωί", hour: 8, minute: 0, notificationId: 3 },
    { id: "a", text: "Διπλό", hour: 9, minute: 0, notificationId: 4 },
    { id: "b", text: "", hour: 9, minute: 0, notificationId: 5 },
    { id: "c", text: "Βράδυ", hour: 24, minute: 0, notificationId: 6 },
  ]);
  assert.equal(clean.length, 1);
  assert.equal(nextNotificationId(clean), 4);
});

test("web does not schedule, and iOS schedules only after permission", async () => {
  assert.equal(canScheduleNatively(undefined), false);
  const web = await applyReminderSchedule([], { isNativePlatform: () => false, nativePromise: async () => ({}) });
  assert.deepEqual(web, { scheduled: false, denied: false });
  const calls = [];
  const cap = {
    isNativePlatform: () => true,
    nativePromise: async (plugin, method, options) => {
      calls.push([plugin, method, options]);
      if (method === "requestPermissions") return { display: "granted" };
      return {};
    },
  };
  const reminder = reminderFromInput({ id: "r1", text: "Έλεγχος", hour: 7, minute: 30, notificationId: 2 });
  const native = await applyReminderSchedule([reminder], cap);
  assert.equal(native.scheduled, true);
  assert.deepEqual(calls.map((call) => call[1]), ["requestPermissions", "cancelAll", "schedule"]);
  const denied = await applyReminderSchedule([reminder], {
    isNativePlatform: () => true,
    nativePromise: async () => ({ display: "denied" }),
  });
  assert.equal(denied.denied, true);
});
