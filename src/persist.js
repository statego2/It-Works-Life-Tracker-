/** Shown when a write does not land and the screen is put back. */
export const SAVE_ROLLBACK_MESSAGE = "Δεν αποθηκεύτηκε. Η οθόνη επέστρεψε στην τελευταία αποθηκευμένη κατάσταση. Κάνε εξαγωγή ή ελευθέρωσε χώρο (π.χ. φωτογραφίες Vision Board).";

/**
 * Apply a save attempt without leaving unsaved edits on screen.
 * `save` returns true only when the attempted workspace was stored.
 * On failure the caller must render `workspace`, which is a clone of the last stored copy.
 */
function finish(saved, attempted, lastSaved) {
  if (!saved) return { ok: false, workspace: structuredClone(lastSaved), message: SAVE_ROLLBACK_MESSAGE };
  return { ok: true, workspace: structuredClone(attempted), message: null };
}

export function commitWorkspace(attempted, lastSaved, save) {
  try {
    const result = save(attempted);
    if (result && typeof result.then === "function") {
      return Promise.resolve(result).then((saved) => finish(saved === true, attempted, lastSaved)).catch(() => finish(false, attempted, lastSaved));
    }
    return finish(result === true, attempted, lastSaved);
  } catch {
    return finish(false, attempted, lastSaved);
  }
}
