import {emptyWorkspace} from "./domain.js";
import {makeBackup,normalizeWorkspace,parseBackup,validateWorkspace} from "./backup.js";
import {REMINDERS_FILE,WORKSPACE_FILE,selectInitialRecord} from "./native-store.js";

const KEY="it-works:local-preview:v1";
const REMINDER_KEY="it-works:reminders:v1";
/** Never overwrite an existing malformed workspace; preserve its raw bytes for recovery. */
let storageBlocked=false;
let mode="web";
let nativeCache=null;
let reminderCache=null;

function capacitor(){
  const cap=globalThis.window?.Capacitor;
  if(!cap?.isNativePlatform?.()||typeof cap.nativePromise!=="function") return null;
  return cap;
}
function readLocal(key){
  try{return globalThis.window?.localStorage?.getItem(key)??null;}
  catch{return null;}
}
async function nativeRead(path){
  try{
    const result=await capacitor().nativePromise("Filesystem","readFile",{path,directory:"DATA",encoding:"utf8"});
    return typeof result?.data==="string"?result.data:null;
  }catch{return null;}
}
async function nativeWrite(path,data){
  await capacitor().nativePromise("Filesystem","writeFile",{path,data,directory:"DATA",encoding:"utf8",recursive:true});
}
export function isNativeStore(){return mode==="native";}
/** On iOS, move an existing localStorage workspace into the durable file once. The website stays on localStorage. */
export async function initStorage(){
  if(!capacitor()) return;
  try{
    const choice=selectInitialRecord({nativeText:await nativeRead(WORKSPACE_FILE),localText:readLocal(KEY)});
    if(choice.source==="localStorage") await nativeWrite(WORKSPACE_FILE,choice.text);
    const reminders=selectInitialRecord({nativeText:await nativeRead(REMINDERS_FILE),localText:readLocal(REMINDER_KEY)});
    if(reminders.source==="localStorage") await nativeWrite(REMINDERS_FILE,reminders.text);
    nativeCache=choice.text;
    reminderCache=reminders.text;
    mode="native";
  }catch(error){
    mode="web";
    console.warn("It Works: native storage unavailable, using this browser.",error);
  }
}
function rawWorkspace(){
  return mode==="native"?nativeCache:globalThis.window?.localStorage?.getItem(KEY);
}
export function loadWorkspace() {
  try {
    const raw=rawWorkspace();
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
  let json;
  try {
    json=JSON.stringify(validateWorkspace(structuredClone(workspace)));
  } catch(error){console.warn("It Works: save failed",error);return false;}
  if(mode==="native"){
    return nativeWrite(WORKSPACE_FILE,json).then(()=>{nativeCache=json;return true;}).catch(error=>{console.warn("It Works: save failed",error);return false;});
  }
  try {
    globalThis.window.localStorage.setItem(KEY,json);
    return true;
  } catch(error){console.warn("It Works: save failed",error);return false;}
}
export function loadReminders(){
  try{
    const raw=mode==="native"?reminderCache:readLocal(REMINDER_KEY);
    const parsed=raw?JSON.parse(raw):[];
    return Array.isArray(parsed)?parsed:[];
  }catch{return [];}
}
export function saveReminders(reminders){
  const json=JSON.stringify(reminders);
  if(mode==="native"){
    return nativeWrite(REMINDERS_FILE,json).then(()=>{reminderCache=json;return true;}).catch(error=>{console.warn("It Works: reminders were not saved",error);return false;});
  }
  try{globalThis.window.localStorage.setItem(REMINDER_KEY,json);return true;}
  catch(error){console.warn("It Works: reminders were not saved",error);return false;}
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
  const json=JSON.stringify(state);
  storageBlocked=false;
  if(mode==="native"){
    return nativeWrite(WORKSPACE_FILE,json).then(()=>{nativeCache=json;return state;});
  }
  // A valid explicit restore may overwrite a corrupted old record, with user confirmation in UI.
  globalThis.window.localStorage.setItem(KEY,json);
  return state;
}
