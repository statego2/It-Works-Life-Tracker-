import {emptyWorkspace, isWorkspaceShape} from "./domain.js";
const KEY = "it-works:local-preview:v1";
export function loadWorkspace() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyWorkspace();
    const value = JSON.parse(raw);
    return isWorkspaceShape(value) ? value : emptyWorkspace();
  } catch { return emptyWorkspace(); }
}
export function saveWorkspace(workspace) {
  try {window.localStorage.setItem(KEY, JSON.stringify(workspace)); return true;}
  catch {return false;}
}
export function exportWorkspace(workspace) {
  const blob = new Blob([JSON.stringify({...workspace, exportedAt:new Date().toISOString()}, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `it-works-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
