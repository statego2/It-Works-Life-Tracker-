/**
 * Portable backup validation (browser + future native clients).
 * Supports the legacy v1 flat JSON exports and the new explicit envelope.
 * Never hydrate DOM data directly from arbitrary unvalidated JSON.
 */
export const BACKUP_FORMAT="itworks.backup";
export const BACKUP_VERSION=1;
export const MAX_BACKUP_BYTES=5_000_000;
const types=new Set(["number","money","percentage","boolean","frequency"]);
const ops=new Set(["at_least","at_most","exact"]);
const periods=new Set(["once","day","week","month","year"]);
const object=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const string=(x,max,min=0)=>typeof x==="string"&&x.length>=min&&x.length<=max;
const date=x=>string(x,80,1)&&Number.isFinite(Date.parse(x));
const integer=x=>Number.isSafeInteger(x)&&x>=0&&x<=100000;
const fail=(message)=>{throw new Error("Μη έγκυρο backup: "+message);};
const check=(ok,message)=>{if(!ok)fail(message);};
const distinct=(values,what)=>check(new Set(values).size===values.length,"διπλά IDs "+what);
function validValue(v,type){
  check(object(v)&&v.type===type,"λανθασμένος τύπος τιμής");
  if(type==="boolean"){check(typeof v.value==="boolean","λανθασμένη τιμή ναι/όχι");return;}
  check(typeof v.amount==="number"&&Number.isFinite(v.amount)&&Math.abs(v.amount)<=1e12,"λανθασμένος αριθμός");
  if(type==="percentage")check(v.amount>=0&&v.amount<=100,"ποσοστό εκτός ορίων");
  if(type==="money")check(string(v.currency,3,3)&&/^[A-Z]{3}$/.test(v.currency)&&periods.has(v.period),"νόμισμα ή περίοδος");
  if(type==="frequency")check(v.amount>=0&&["day","week","month","year"].includes(v.period)&&v.mode==="reported_rate","λανθασμένη συχνότητα");
}
function validateImage(image){
  check(object(image)&&string(image.id,100,1)&&string(image.dataUrl,260000,100),"εικόνα");
  check(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image.dataUrl),"μη υποστηριζόμενη μορφή εικόνας");
  check(string(image.title??"",120)&&date(image.createdAt),"λεπτομέρειες εικόνας");
}
export function normalizeWorkspace(state){
  if(!Array.isArray(state.notes))state.notes=[];
  if(!object(state.vision))state.vision={visible:false,mode:"fixed",rotationHours:3,images:[]};
  return state;
}
export function validateWorkspace(input){
  check(object(input)&&input.version===1,"άγνωστη έκδοση δεδομένων");
  check(Array.isArray(input.areas)&&input.areas.length<=100,"τομείς");
  check(Array.isArray(input.metrics)&&input.metrics.length<=2000,"στόχοι");
  check(object(input.purpose)&&string(input.purpose.text,1000)&&typeof input.purpose.visible==="boolean","Σκοπός");
  for(const a of input.areas){
    check(object(a)&&string(a.id,100,1)&&string(a.name,80,1)&&date(a.createdAt)&&integer(a.order),"φάκελος");
    check(!a.color||(/^#[0-9a-f]{6}$/i).test(a.color),"χρώμα φακέλου");
  }
  distinct(input.areas.map(a=>a.id),"φακέλων");
  const areaIds=new Set(input.areas.map(a=>a.id));
  for(const m of input.metrics){
    check(object(m)&&string(m.id,100,1)&&areaIds.has(m.areaId)&&string(m.title,120,1),"στόχος");
    check(types.has(m.type)&&["goal","standard"].includes(m.kind)&&ops.has(m.comparator),"τύπος στόχου");
    check(string(m.unit??"",30)&&typeof m.gold==="boolean"&&date(m.createdAt),"λεπτομέρειες στόχου");
    if(m.order!==undefined)check(integer(m.order),"σειρά στόχου");
    if(m.goldOrder!==undefined)check(integer(m.goldOrder),"σειρά χρυσού στόχου");
    check(Array.isArray(m.targets)&&m.targets.length>=1&&m.targets.length<=10000,"ιστορικό standards");
    check(Array.isArray(m.observations)&&m.observations.length<=10000,"ιστορικό καταγραφών");
    for(const t of m.targets){
      check(object(t)&&string(t.id,100,1)&&date(t.effectiveAt)&&date(t.createdAt),"ιστορικό στόχου");
      validValue(t.value,m.type);
    }
    for(const o of m.observations){
      check(object(o)&&string(o.id,100,1)&&date(o.observedAt)&&date(o.createdAt),"ιστορικό μετρήσεων");
      validValue(o.value,m.type);
    }
    distinct([...m.targets,...m.observations].map(x=>x.id),"ιστορικού");
  }
  distinct(input.metrics.map(m=>m.id),"στόχων");
  const state=normalizeWorkspace(input);
  check(state.notes.length<=100,"προσωπικές σημειώσεις");
  for(const note of state.notes)check(object(note)&&string(note.id,100,1)&&string(note.title,120)&&string(note.body,4000)&&typeof note.pinned==="boolean"&&date(note.createdAt)&&date(note.updatedAt),"σημείωση");
  distinct(state.notes.map(n=>n.id),"σημειώσεων");
  check(typeof state.vision.visible==="boolean"&&["fixed","rotate"].includes(state.vision.mode)&&[1,3,6,12,24].includes(state.vision.rotationHours),"ρυθμίσεις Vision Board");
  check(Array.isArray(state.vision.images)&&state.vision.images.length<=8,"πλήθος φωτογραφιών");
  state.vision.images.forEach(validateImage);
  distinct(state.vision.images.map(i=>i.id),"εικόνων");
  return state;
}
export function makeBackup(workspace,now=new Date().toISOString()){
  const data=validateWorkspace(structuredClone(workspace));
  return {format:BACKUP_FORMAT,backupVersion:BACKUP_VERSION,exportedAt:now,workspace:data};
}
export function parseBackup(text){
  check(typeof text==="string"&&new TextEncoder().encode(text).length<=MAX_BACKUP_BYTES,"μέγεθος αρχείου");
  let parsed;
  try{parsed=JSON.parse(text);}catch{fail("το αρχείο δεν είναι JSON");}
  if(parsed?.format===BACKUP_FORMAT){
    check(parsed.backupVersion===BACKUP_VERSION,"μη υποστηριζόμενη έκδοση backup");
    return validateWorkspace(parsed.workspace);
  }
  // Legacy flat v1 backups exported before the envelope existed.
  return validateWorkspace(parsed);
}
