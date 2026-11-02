import {emptyWorkspace} from "./domain.js";
import {makeBackup,normalizeWorkspace,parseBackup,validateWorkspace} from "./backup.js";

const KEY="it-works:local-preview:v1";
/** Never overwrite an existing malformed workspace; preserve its raw bytes for recovery. */
let storageBlocked=false;
export function loadWorkspace() {
  try {
    const raw=window.localStorage.getItem(KEY);
    if(!raw){storageBlocked=false;return normalizeWorkspace(emptyWorkspace());}
    const state=validateWorkspace(JSON.parse(raw));
    storageBlocked=false;
    return state;
  } catch(error) {
    storageBlocked=true;
    console.warn("It Works: local data could not be loaded; writes are blocked until a valid restore.",error);
    return normalizeWorkspace(emptyWorkspace());
  }
}
export function isStorageBlocked(){return storageBlocked;}
export function saveWorkspace(workspace) {
  if(storageBlocked) return false;
  try {
    const normalized=validateWorkspace(structuredClone(workspace));
    window.localStorage.setItem(KEY,JSON.stringify(normalized));
    return true;
  } catch(error){console.warn("It Works: save failed",error);return false;}
}
export function exportWorkspace(workspace) {
  const payload=makeBackup(workspace);
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download="it-works-backup-"+new Date().toISOString().slice(0,10)+".json";
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
export function importWorkspace(text) {
  const state=parseBackup(text);
  // A valid explicit restore may overwrite a corrupted old record, with user confirmation in UI.
  window.localStorage.setItem(KEY,JSON.stringify(state));
  storageBlocked=false;
  return state;
}
