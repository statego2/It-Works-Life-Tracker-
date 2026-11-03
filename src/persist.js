/** Shown when a write does not land and the screen is put back. */
export const SAVE_ROLLBACK_MESSAGE = "Δεν αποθηκεύτηκε. Η οθόνη επέστρεψε στην τελευταία αποθηκευμένη κατάσταση. Κάνε εξαγωγή ή ελευθέρωσε χώρο (π.χ. φωτογραφίες Vision Board).";

/**
 * Apply a save attempt without leaving unsaved edits on screen.
 * `save` returns true only when the attempted workspace was stored.
 * On failure the caller must render `workspace`, which is a clone of the last stored copy.
 */
export function commitWorkspace(attempted, lastSaved, save) {
  let saved = false;
  try {
    saved = save(attempted) === true;
  } catch {
    saved = false;
  }
  if (!saved) {
    return { ok: false, workspace: structuredClone(lastSaved), message: SAVE_ROLLBACK_MESSAGE };
  }
  return { ok: true, workspace: structuredClone(attempted), message: null };
}
