const MAX_REMINDERS = 8;

export function sanitizeReminders(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const clean = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const text = typeof item.text === "string" ? item.text.trim() : "";
    const hour = item.hour;
    const minute = item.minute;
    const notificationId = item.notificationId;
    if (!text || text.length > 140) continue;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) continue;
    if (!Number.isInteger(notificationId) || notificationId < 1 || notificationId > 2147483647) continue;
    if (typeof item.id !== "string" || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    clean.push({ id: item.id, notificationId, text, hour, minute });
    if (clean.length === MAX_REMINDERS) break;
  }
  return clean;
}

export function nextNotificationId(reminders) {
  return reminders.reduce((max, item) => Math.max(max, item.notificationId || 0), 0) + 1;
}

export function reminderFromInput({ id, text, hour, minute, notificationId }) {
  const cleanText = String(text ?? "").trim();
  const h = Number(hour);
  const m = Number(minute);
  if (!cleanText) throw new Error("Γράψε το κείμενο της υπενθύμισης.");
  if (cleanText.length > 140) throw new Error("Το κείμενο είναι πολύ μεγάλο.");
  if (!Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(m) || m < 0 || m > 59) throw new Error("Διάλεξε έγκυρη ώρα.");
  return { id, notificationId, text: cleanText, hour: h, minute: m };
}

/** Daily local notification payload. No server. */
export function schedulePayload(reminders) {
  return {
    notifications: reminders.map((reminder) => ({
      id: reminder.notificationId,
      title: "It Works",
      body: reminder.text,
      schedule: { on: { hour: reminder.hour, minute: reminder.minute }, repeats: true },
    })),
  };
}

export function canScheduleNatively(cap) {
  return cap?.isNativePlatform?.() === true && typeof cap.nativePromise === "function";
}

export async function applyReminderSchedule(reminders, cap) {
  if (!canScheduleNatively(cap)) return { scheduled: false, denied: false };
  const permission = await cap.nativePromise("LocalNotifications", "requestPermissions");
  if (permission?.display !== "granted") return { scheduled: false, denied: true };
  await cap.nativePromise("LocalNotifications", "cancelAll");
  if (reminders.length) await cap.nativePromise("LocalNotifications", "schedule", schedulePayload(reminders));
  return { scheduled: true, denied: false };
}
