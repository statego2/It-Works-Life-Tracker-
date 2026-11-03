import { parseBackup } from "./backup.js";

/** JSON file in the app data directory. Kept out of UserDefaults because vision photos are large. */
export const WORKSPACE_FILE = "it-works/workspace.json";
export const REMINDERS_FILE = "it-works/reminders.json";
export const APP_GROUP = "group.com.statego2.itworks";
export const WIDGET_SNAPSHOT_KEY = "goldSnapshot";

/**
 * One-time choice when the native file is still empty.
 * An existing native record wins, even if this browser also has localStorage.
 * A non-empty localStorage record is copied only when the native file is missing.
 */
export function selectInitialRecord({ nativeText, localText }) {
  if (typeof nativeText === "string" && nativeText.trim()) return { source: "native", text: nativeText };
  if (typeof localText === "string" && localText.trim()) return { source: "localStorage", text: localText };
  return { source: "empty", text: null };
}

/** Validate a backup (legacy flat JSON or the envelope) and return the JSON to store. */
export function recordFromBackup(text) {
  return JSON.stringify(parseBackup(text));
}
