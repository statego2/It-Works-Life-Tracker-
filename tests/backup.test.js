import test from 'node:test';
import assert from 'node:assert/strict';
import {demoWorkspace,createArea,createMetric,normalizeMetricOrders} from '../src/domain.js';
import {makeBackup,parseBackup,validateWorkspace,normalizeWorkspace,MAX_BACKUP_BYTES} from '../src/backup.js';
import {currentVisionImage} from '../src/vision.js';

test('legacy flat v1 workspace restores without loss',()=>{
 const original=demoWorkspace();normalizeMetricOrders(original);
 const restored=parseBackup(JSON.stringify({...original,exportedAt:new Date().toISOString()}));
 assert.equal(restored.metrics.length,original.metrics.length);
 assert.equal(restored.areas.length,original.areas.length);
 assert.equal(restored.metrics[0].observations.length,1);
 assert.deepEqual(restored.notes,[]);
});
test('versioned backup round trip retains target and actual history',()=>{
 const original=demoWorkspace();original.notes=[{id:'note-1',title:'Private',body:'Personal writing',pinned:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}];
 const restored=parseBackup(JSON.stringify(makeBackup(original)));
 assert.equal(restored.notes[0].body,'Personal writing');
 assert.deepEqual(restored.metrics[0].targets,original.metrics[0].targets);
 assert.deepEqual(restored.metrics[0].observations,original.metrics[0].observations);
});
test('reject unknown format or version and invalid JSON',()=>{
 assert.throws(()=>parseBackup('not-json'));
 assert.throws(()=>parseBackup(JSON.stringify({format:'itworks.backup',backupVersion:77,workspace:demoWorkspace()})));
});
test('reject malicious cross-folder references and invalid metric value',()=>{
 const w=demoWorkspace();w.metrics[0].areaId='other-account-area';
 assert.throws(()=>validateWorkspace(w));
 const x=demoWorkspace();x.metrics[0].observations[0].value.amount=Infinity;
 assert.throws(()=>validateWorkspace(x));
});
test('reject duplicate identities and invalid user-provided image data',()=>{
 const w=demoWorkspace();w.areas.push({...w.areas[0]});
 assert.throws(()=>validateWorkspace(w));
 const x=normalizeWorkspace(demoWorkspace());x.vision.images=[{id:'x',title:'x',dataUrl:'data:text/html;base64,PHNjcmlwdD4=',createdAt:new Date().toISOString()}];
 assert.throws(()=>validateWorkspace(x));
});
test('reject oversized backup before JSON parsing',()=>{
 assert.throws(()=>parseBackup('x'.repeat(MAX_BACKUP_BYTES+1)));
});
test('vision choice returns null by default; selected image is time dependent',()=>{
 const v={visible:false,mode:'fixed',rotationHours:1,images:[{id:'a'},{id:'b'}]};
 assert.equal(currentVisionImage(v),null);
 v.visible=true;
 assert.equal(currentVisionImage(v)?.id,'a');
 v.mode='rotate';
 assert.equal(currentVisionImage(v,0)?.id,'a');
 assert.equal(currentVisionImage(v,3600000)?.id,'b');
});
test('new workspace remains empty, and image/note preferences are optional',()=>{
 const w=demoWorkspace();const restored=validateWorkspace(w);
 assert.equal(restored.notes.length,0);assert.equal(restored.vision.visible,false);
});
