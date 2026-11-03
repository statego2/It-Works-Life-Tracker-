import {addObservation,changeTarget,cleanText,compareMetric,createArea,createMetric,demoWorkspace,describeGap,formatValue,getCurrent,getTarget,metricsInArea,orderedAreas,orderedGoldMetrics,normalizeMetricOrders,moveMetric,metricProgress,VALUE_TYPES} from './domain.js?v=20261103-native-v11';
import {exportWorkspace,importWorkspace,initStorage,isStorageBlocked,loadReminders,loadWorkspace,saveReminders,saveWorkspace} from './storage.js?v=20261103-native-v11';
import {normalizeWorkspace,parseBackup} from './backup.js?v=20261103-native-v11';
import {DIRECTION_LABELS,DIRECTIONS,moveAffirmation,orderedAffirmations} from './appearance.js?v=20261103-native-v11';
import {currentVisionImage,compressVisionPhoto} from './vision.js?v=20261103-native-v11';
import {commitWorkspace,SAVE_ROLLBACK_MESSAGE} from './persist.js?v=20261103-native-v11';
import {applyReminderSchedule,canScheduleNatively,nextNotificationId,reminderFromInput,sanitizeReminders} from './reminders.js?v=20261103-native-v11';
import {goldWidgetSnapshot} from './widget-snapshot.js?v=20261103-native-v11';

await initStorage();
let workspace = loadWorkspace();
workspace.notes ??=[];
workspace.vision ??={visible:false,mode:'fixed',rotationHours:3,images:[]};
let view = 'all';
let tab = 'today';
let ordering = false;
normalizeMetricOrders(workspace);
let lastSaved = structuredClone(workspace);
let reminders = sanitizeReminders(loadReminders());
let saveError = '';
let toastTimer;
let ignoreClick=false;
const root = document.getElementById('root');
const modalRoot = document.getElementById('modal-root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = (iso) => iso ? new Intl.DateTimeFormat('el-GR',{dateStyle:'medium'}).format(new Date(iso)) : '—';
const label = (m) => m.kind === 'goal' ? 'Στόχος' : 'Standard';
const statusName = {met:'Επιτεύχθηκε',unmet:'Σε εξέλιξη',unknown:'Δεν έχει καταγραφεί',incompatible:'Ασυμβατό',not_configured:'Χωρίς στόχο'};
const metricById = id => workspace.metrics.find(m => m.id === id);
const areaById = id => workspace.areas.find(a => a.id === id);
const noteById = id => workspace.notes.find(n => n.id === id);
function toast(message, error=false) {
  const el=document.getElementById('toast');el.textContent=message;el.className=error?'show error':'show';
  el.setAttribute('aria-live', error?'assertive':'polite');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='', error?8000:4500);
}
function publishWidget(state){
  const cap=window.Capacitor;
  if(!cap?.isNativePlatform?.()||typeof cap.nativePromise!=='function') return;
  const json=JSON.stringify(goldWidgetSnapshot(state));
  cap.nativePromise('WidgetBridge','setSnapshot',{json}).catch(error=>console.warn('It Works: widget snapshot was not saved',error));
}
function hapticImpact(style='LIGHT'){
  const cap=window.Capacitor;
  if(!cap?.isNativePlatform?.()||typeof cap.nativePromise!=='function')return;
  cap.nativePromise('Haptics','impact',{style}).catch(()=>{});
}
function syncStatusBar(){
  const cap=window.Capacitor;
  if(!cap?.isNativePlatform?.()||typeof cap.nativePromise!=='function')return;
  const dark=workspace.appearance?.scheme!=='light';
  cap.nativePromise('StatusBar','setOverlaysWebView',{overlay:true}).catch(()=>{});
  cap.nativePromise('StatusBar','setStyle',{style:dark?'DARK':'LIGHT'}).catch(()=>{});
}
function applyAppearance(){
  const appearance=workspace.appearance||{direction:'sanctuary',scheme:'dark'};
  document.documentElement.dataset.direction=appearance.direction;
  document.documentElement.dataset.scheme=appearance.scheme;
  document.documentElement.style.colorScheme=appearance.scheme==='dark'?'dark':'light';
  const theme=document.querySelector('meta[name="theme-color"]');
  if(theme)theme.content=appearance.scheme==='dark'?'#07080c':'#f6f7fb';
  syncStatusBar();
}
function bindChrome(){
  const scroller=document.getElementById('screen-scroll');
  const bar=document.getElementById('nav-bar');
  if(scroller&&bar)scroller.addEventListener('scroll',()=>bar.classList.toggle('collapsed',scroller.scrollTop>16),{passive:true});
  document.querySelectorAll('.swipe-row').forEach(row=>{
    let startX=0, startY=0, dx=0, timer=0, pressing=true;
    const front=row.querySelector('.swipe-front');
    row.addEventListener('pointerdown',event=>{
      startX=event.clientX;startY=event.clientY;dx=0;pressing=true;
      timer=setTimeout(()=>{
        if(!pressing)return;
        ignoreClick=true;
        const metric=metricById(row.dataset.id);
        if(!metric)return;
        metric.gold=!metric.gold;
        if(metric.gold)metric.goldOrder=orderedGoldMetrics(workspace).length;else delete metric.goldOrder;
        hapticImpact('MEDIUM');
        commit(metric.gold?'Προστέθηκε στους χρυσούς στόχους':'Αφαιρέθηκε από χρυσούς στόχους');
      },480);
    });
    row.addEventListener('pointermove',event=>{
      dx=event.clientX-startX;
      if(Math.abs(dx)>12||Math.abs(event.clientY-startY)>12){pressing=false;clearTimeout(timer);}
      if(dx<0&&front)front.style.transform=`translateX(${Math.max(dx,-148)}px)`;
    });
    const end=()=>{
      clearTimeout(timer);pressing=false;
      if(!front)return;
      const open=dx<-64;
      front.style.transform=open?'translateX(-148px)':'';
      if(open)hapticImpact();
      dx=0;
    };
    row.addEventListener('pointerup',end);
    row.addEventListener('pointercancel',end);
  });
}
function renderSwitcher(){
  const appearance=workspace.appearance;
  const directions=DIRECTIONS.map(direction=>`<button type="button" data-action="direction" data-direction="${direction}" aria-pressed="${appearance.direction===direction}">${DIRECTION_LABELS[direction]}</button>`).join('');
  return `<div class="appearance-switch" role="group" aria-label="Προτάσεις εμφάνισης">${directions}<button type="button" data-action="scheme" aria-pressed="${appearance.scheme==='dark'}">${appearance.scheme==='dark'?'Σκούρο':'Φωτεινό'}</button></div>`;
}
function renderHero(){
  const image=workspace.vision?.visible?currentVisionImage(workspace.vision):null;
  const emblem=workspace.vision?.visible?(workspace.vision.images||[]).find(item=>item!==image&&item.id!==image?.id):null;
  return `<section class="vision-hero">${image?`<img class="vision-photo" src="${image.dataUrl}" alt="${esc(image.title||'Εικόνα οράματος')}"/>`:`<div class="vision-fallback" role="img" aria-label="Ουδέτερη εικόνα, χωρίς προσωπική φωτογραφία"></div>`}<button type="button" class="vision-edit" data-action="vision" aria-label="Επεξεργασία Vision Board">✎</button>${emblem?`<img class="emblem-photo" src="${emblem.dataUrl}" alt="${esc(emblem.title||'Έμβλημα')}"/>`:`<div class="emblem" aria-hidden="true"></div>`}</section>`;
}
function renderAffirmations(){
  if(!workspace.appearance?.showAffirmations)return '';
  const list=orderedAffirmations(workspace);
  const items=list.map((item,index)=>`<li><span>${index+1}.</span><b>${esc(item.text)}</b></li>`).join('');
  return `<section class="affirmation-block"><div class="section-heading"><h2>Δηλώσεις</h2><button type="button" class="text-btn" data-action="affirmations">Επεξεργασία</button></div>${items?`<ol class="affirmation-list">${items}</ol>`:`<button type="button" class="purpose-placeholder" data-action="affirmations">＋ Πρόσθεσε μια δήλωση</button>`}</section>`;
}
function renderIdentity(){
  if(!workspace.appearance?.showIdentity||!workspace.identity?.visible)return '';
  const sections=workspace.identity.sections.filter(section=>section.visible);
  const body=sections.map(section=>`<section class="identity-section"><p class="identity-eyebrow">${esc(section.eyebrow)}</p>${section.title?`<h3>${esc(section.title)}</h3>`:''}${section.body?`<p>${esc(section.body)}</p>`:''}${section.chips.length?`<div class="identity-chips">${section.chips.map(chip=>`<span class="chip">${esc(chip.label)}</span>`).join('')}</div>`:''}</section>`).join('');
  const filled=sections.some(section=>section.title||section.body||section.chips.length);
  if(!filled)return `<button type="button" class="purpose-placeholder" data-action="identity">＋ Συμπλήρωσε ταυτότητα και αποστολή</button>`;
  return `<section class="identity-board"><button type="button" class="identity-edit" data-action="identity" aria-label="Επεξεργασία ταυτότητας">✎</button>${body}</section>`;
}
async function commit(message='Αποθηκεύτηκε σε αυτή τη συσκευή') {
  normalizeWorkspace(workspace);
  normalizeMetricOrders(workspace);
  const result=await Promise.resolve(commitWorkspace(workspace, lastSaved, saveWorkspace));
  workspace=result.workspace;
  saveError=result.ok?'':result.message;
  if(result.ok){lastSaved=structuredClone(workspace);publishWidget(workspace);}
  applyAppearance();
  render();
  toast(result.ok?message:(result.message||SAVE_ROLLBACK_MESSAGE), !result.ok);
  return result.ok;
}
function clock(reminder){return `${String(reminder.hour).padStart(2,'0')}:${String(reminder.minute).padStart(2,'0')}`;}
async function persistReminders(next,message){
  const saved=await Promise.resolve(saveReminders(next));
  if(!saved){toast(SAVE_ROLLBACK_MESSAGE,true);return;}
  reminders=next;
  const outcome=await applyReminderSchedule(reminders,window.Capacitor);
  if(outcome.denied) toast('Η άδεια για ειδοποιήσεις δεν δόθηκε. Η υπενθύμιση αποθηκεύτηκε.',true);
  else if(!outcome.scheduled) toast(message||'Αποθηκεύτηκε. Η ειδοποίηση χτυπάει μόνο στην εφαρμογή iPhone.');
  else toast(message||'Η υπενθύμιση ορίστηκε σε αυτή τη συσκευή.');
  showReminderForm();
}
function showReminderForm(){
  const native=canScheduleNatively(window.Capacitor);
  const rows=reminders.map(r=>`<li><b>${esc(clock(r))} · ${esc(r.text)}</b><button type="button" class="danger-link" data-action="delete-reminder" data-id="${esc(r.id)}">Αφαίρεση</button></li>`).join('');
  showDialog(dialogFrame('Υπενθυμίσεις',`<form id="entry-form" data-form="reminder"><p class="form-hint">${native?'Διάλεξε εσύ την ώρα. Η ειδοποίηση μένει σε αυτή τη συσκευή, χωρίς server.':'Στην ιστοσελίδα η υπενθύμιση αποθηκεύεται. Η ειδοποίηση χτυπάει μόνο στην εφαρμογή iPhone.'}</p><ul class="history-list">${rows||'<li>Καμία υπενθύμιση</li>'}</ul><div class="field"><label for="reminder-text">Κείμενο</label><input id="reminder-text" name="text" maxlength="140" required placeholder="π.χ. Κοίτα τους χρυσούς στόχους"/></div><div class="field"><label for="reminder-time">Ώρα</label><input id="reminder-time" name="time" type="time" required value="09:00"/></div></form>`,'Προσθήκη'));
}
function escapeAttrColor(color){return /^#[0-9a-fA-F]{6}$/.test(String(color))?color:'#7067cf';}
function valueForInput(value){return !value?'':value.type==='boolean'?(value.value?'yes':'no'):String(value.amount);}
function valueLabel(value,metric){return value?`${formatValue(value)}${value.type==='number'&&metric.unit?' '+esc(metric.unit):''}`:'Δεν έχει καταγραφεί';}
function getCounts(){const comparisons=workspace.metrics.map(compareMetric);return {areas:workspace.areas.length,metrics:workspace.metrics.length,met:comparisons.filter(x=>x.status==='met').length,unknown:comparisons.filter(x=>x.status==='unknown').length};}

function renderMetric(metric, condensed=false, collection='area', position=0, total=1) {
  const result=compareMetric(metric), actual=result.actual?.value, target=result.target?.value;
  const progress=metricProgress(metric,result);
  const active=['met','unmet'].includes(result.status);
  const currentText=valueLabel(actual,metric), targetText=valueLabel(target,metric);
  const progressMarkup=progress
    ? `<div class="compact-track" role="progressbar" aria-label="${esc(metric.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.filled}" aria-valuetext="${esc(currentText)} από ${esc(targetText)}"><span style="width:${progress.filled}%"></span></div><div class="compact-percent">${new Intl.NumberFormat('el-GR',{maximumFractionDigits:1}).format(progress.percentage)}%</div>`
    : `<div class="compact-state">${result.status==='unknown'?'Δεν έχει καταγραφεί':result.status==='incompatible'?'Μη συγκρίσιμες τιμές':result.status==='not_configured'?'Χωρίς standard':metric.type==='boolean'?(result.status==='met'?'✓ Σύμφωνο με τον στόχο':'Διαφορετική κατάσταση'):(active?'Σύγκριση χωρίς ποσοστό':'—')}</div>`;
  return `<article class="metric-card compact-card ${condensed?'condensed':''}">
    <div class="compact-top">
      ${ordering?`<div class="metric-order-controls"><button type="button" class="order-arrow" data-action="move-metric" data-id="${esc(metric.id)}" data-collection="${collection}" data-dir="-1" ${position===0?'disabled':''} aria-label="Μετακίνηση πάνω">↑</button><button type="button" class="order-arrow" data-action="move-metric" data-id="${esc(metric.id)}" data-collection="${collection}" data-dir="1" ${position===total-1?'disabled':''} aria-label="Μετακίνηση κάτω">↓</button></div>`:''}
      <button type="button" class="compact-open" data-action="toggle-metric" data-id="${esc(metric.id)}" aria-expanded="false" aria-label="Λεπτομέρειες: ${esc(metric.title)}">
        <span class="compact-title">${esc(metric.title)}</span><span class="compact-chevron" aria-hidden="true">⌄</span>
      </button>
      <button type="button" class="icon-btn gold-btn ${metric.gold?'selected':''}" data-action="gold" data-id="${esc(metric.id)}" aria-label="${metric.gold?'Αφαίρεση από χρυσούς στόχους':'Χρυσός στόχος'}" title="Χρυσός στόχος">${metric.gold?'★':'☆'}</button>
    </div>
    <div class="compact-values"><span class="current-hit"><button type="button" class="value-hit" data-action="update" data-id="${esc(metric.id)}" aria-label="Ενημέρωση: ${esc(metric.title)}"><small>ΤΩΡΑ</small><strong>${currentText}</strong></button></span><span class="target-hit"><small>STANDARD / ΣΤΟΧΟΣ</small><strong>${targetText}</strong></span></div>
    ${progressMarkup}
    <div class="compact-details" hidden>
      <div class="compact-meta">${label(metric)} · ${result.actual?'Ενημερώθηκε '+dateLabel(result.actual.observedAt):'Χωρίς ενημέρωση'}${metric.type==='frequency'?' · Αυτοαναφερόμενη συχνότητα':''}</div>
      <div class="compact-actions">
        <button type="button" class="small-primary" data-action="update" data-id="${esc(metric.id)}">Ενημέρωση</button>
        <button type="button" class="outline-btn" data-action="history" data-id="${esc(metric.id)}">Ιστορικό</button>
        <button type="button" class="outline-btn" data-action="edit-metric" data-id="${esc(metric.id)}">Επεξεργασία</button>
      </div>
    </div>
  </article>`;
}
function renderArea(area) {
  const metrics=metricsInArea(workspace,area.id);
  const index=orderedAreas(workspace).findIndex(x=>x.id===area.id);
  return `<section class="area-card" id="area-${esc(area.id)}">
    <div class="area-head">
      <div class="area-heading"><span class="area-symbol" style="--area-color:${escapeAttrColor(area.color)}">▦</span><div><h3>${esc(area.name)}</h3></div></div>
      <div class="area-controls">
        <button class="icon-btn" data-action="move-area" data-id="${esc(area.id)}" data-dir="-1" ${index===0?'disabled':''} title="Μετακίνηση πάνω" aria-label="Μετακίνηση πάνω">↑</button>
        <button class="icon-btn" data-action="move-area" data-id="${esc(area.id)}" data-dir="1" ${index===workspace.areas.length-1?'disabled':''} title="Μετακίνηση κάτω" aria-label="Μετακίνηση κάτω">↓</button>
        <button class="icon-btn" data-action="edit-area" data-id="${esc(area.id)}" title="Μετονομασία" aria-label="Μετονομασία φακέλου">✎</button>
      </div>
    </div>
    <div class="area-metrics">${metrics.length?metrics.map((m,i)=>renderMetric(m,false,'area',i,metrics.length)).join(''):'<div class="area-empty">Δεν έχεις προσθέσει ακόμη κάποιον στόχο ή standard.</div>'}</div>
    <div class="area-footer"><button class="area-add" data-action="add-metric" data-area="${esc(area.id)}"><span>＋</span> Νέος στόχος / standard</button></div>
  </section>`;
}
function renderVision(){
 const image=currentVisionImage(workspace.vision);
 return image?`<section class="vision-panel"><img class="vision-photo" src="${image.dataUrl}" alt="${esc(image.title||'Vision Board')}" /><button type="button" class="vision-edit" data-action="vision" aria-label="Επεξεργασία Vision Board">✎</button></section>`:'';
}
function showVisionForm(){
 const v=workspace.vision;
 showDialog(`<div class="dialog-head"><h2>Vision Board</h2><button type="button" class="icon-btn" data-action="close" aria-label="Κλείσιμο">✕</button></div><div class="vision-thumbs">${v.images.map(i=>`<div class="vision-thumb"><img src="${i.dataUrl}" alt="${esc(i.title)}"/><button type="button" data-action="delete-image" data-id="${esc(i.id)}" aria-label="Αφαίρεση">✕</button></div>`).join('')}</div><form id="entry-form" data-form="vision"><label class="check-line"><input type="checkbox" name="visible" ${v.visible?'checked':''}/> Εμφάνιση στο dashboard</label><div class="field"><label>Προβολή</label><select name="mode"><option value="fixed" ${v.mode==='fixed'?'selected':''}>Σταθερή</option><option value="rotate" ${v.mode==='rotate'?'selected':''}>Εναλλαγή</option></select></div><div class="field"><label>Εναλλαγή κάθε</label><select name="rotationHours">${[1,3,6,12,24].map(h=>`<option value="${h}" ${v.rotationHours===h?'selected':''}>${h} ώρες</option>`).join('')}</select></div></form><label class="outline-btn vision-upload">＋ Φωτογραφία<input type="file" id="vision-file" accept="image/jpeg,image/png,image/webp" hidden /></label><p class="form-hint">Έως 8 φωτογραφίες, αποθηκευμένες τοπικά.</p><div class="dialog-actions"><button type="button" class="outline-btn" data-action="close">Κλείσιμο</button><button type="submit" form="entry-form" class="primary-btn">Αποθήκευση</button></div>`);
}
function renderNotes(){
 const list=[...workspace.notes].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt.localeCompare(a.updatedAt));
 return `<section class="notes-section"><button class="outline-btn" data-action="add-note">＋ Νέα σημείωση</button><div class="notes-list">${list.map(n=>`<button class="note-card" data-action="edit-note" data-id="${esc(n.id)}"><strong>${esc(n.title||'Χωρίς τίτλο')}</strong><span>${esc(n.body.slice(0,160))}</span></button>`).join('')}</div></section>`;
}
function showNoteForm(note=null){
 showDialog(dialogFrame(note?'Σημείωση':'Νέα σημείωση',`<form id="entry-form" data-form="note" data-id="${esc(note?.id||'')}"><div class="field"><label>Τίτλος</label><input name="title" maxlength="120" value="${esc(note?.title||'')}"/></div><div class="field"><label>Κείμενο</label><textarea name="body" rows="9" maxlength="4000">${esc(note?.body||'')}</textarea></div><label class="check-line"><input type="checkbox" name="pinned" ${note?.pinned?'checked':''}/> Πάνω πάνω</label>${note?`<button class="danger-link" type="button" data-action="delete-note" data-id="${esc(note.id)}">Διαγραφή σημείωσης</button>`:''}</form>`));
}
const TAB_TITLES={today:'Σήμερα',goals:'Στόχοι',vision:'Όραμα',settings:'Ρυθμίσεις'};
function tabIcon(name){
  const paths={
    today:'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z',
    goals:'M12 3.5 14.2 9H20l-4.7 3.6 1.8 5.6L12 14.8 6.9 18.2 8.7 12.6 4 9h5.8L12 3.5Z',
    vision:'M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Zm4.2 1.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM6.2 16.2l3.2-3.4 2.1 2.2 2.6-3.2 3.7 4.4H6.2Z',
    settings:'M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm7.2 3.1-1.6-.3a6.2 6.2 0 0 0-.5-1.2l.9-1.3-1.1-1.1-1.3.9a6.2 6.2 0 0 0-1.2-.5l-.3-1.6h-1.6l-.3 1.6a6.2 6.2 0 0 0-1.2.5l-1.3-.9-1.1 1.1.9 1.3c-.2.4-.4.8-.5 1.2l-1.6.3v1.6l1.6.3c.1.4.3.8.5 1.2l-.9 1.3 1.1 1.1 1.3-.9c.4.2.8.4 1.2.5l.3 1.6h1.6l.3-1.6c.4-.1.8-.3 1.2-.5l1.3.9 1.1-1.1-.9-1.3c.2-.4.4-.8.5-1.2l1.6-.3v-1.6Z'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${paths[name]}"/></svg>`;
}
function renderGoalRow(metric){
  const result=compareMetric(metric), actual=result.actual?.value, target=result.target?.value;
  const progress=metricProgress(metric,result);
  const currentText=valueLabel(actual,metric), targetText=valueLabel(target,metric);
  const progressMarkup=progress
    ? `<div class="compact-track" role="progressbar" aria-label="${esc(metric.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.filled}" aria-valuetext="${esc(currentText)} από ${esc(targetText)}"><span style="width:${progress.filled}%"></span></div>`
    : `<div class="compact-state">${result.status==='unknown'?'Δεν έχει καταγραφεί':result.status==='incompatible'?'Μη συγκρίσιμες τιμές':result.status==='not_configured'?'Χωρίς στόχο':metric.type==='boolean'?(result.status==='met'?'Σύμφωνο με τον στόχο':'Διαφορετική κατάσταση'):'Χωρίς ποσοστό'}</div>`;
  return `<div class="swipe-row" data-id="${esc(metric.id)}"><div class="swipe-actions"><button type="button" data-action="edit-metric" data-id="${esc(metric.id)}">Επεξεργασία</button><button type="button" data-action="delete-metric" data-id="${esc(metric.id)}">Διαγραφή</button></div><button type="button" class="goal-row swipe-front compact-card" data-action="update" data-id="${esc(metric.id)}" aria-label="Ενημέρωση: ${esc(metric.title)}"><div class="goal-title"><span>${esc(metric.title)}</span>${metric.gold?'<i class="gold-mark" aria-label="Χρυσός στόχος">★</i>':''}</div><div class="compact-values"><span class="current-hit"><small>ΤΩΡΑ</small><strong>${currentText}</strong></span><span class="target-hit"><small>ΣΤΟΧΟΣ</small><strong>${targetText}</strong></span></div>${progressMarkup}</button></div>`;
}
function renderToday(areas, gold){
  if(!areas.length)return `<section class="empty-native"><h2>Η ζωή σου, σε μία οθόνη</h2><p>Φτιάξε έναν τομέα και βάλε το τώρα αριστερά, τον στόχο δεξιά.</p><button type="button" class="primary-btn" data-action="add-area">Δημιουργία πρώτου τομέα</button><button type="button" class="text-btn" data-action="load-demo">Δες ένα παράδειγμα</button></section>`;
  const purpose=workspace.purpose.visible&&workspace.purpose.text?`<button type="button" class="purpose-line" data-action="purpose">${esc(workspace.purpose.text)}</button>`:'';
  const goals=gold.length?`<section class="group"><h2 class="group-label">Χρυσοί στόχοι</h2><div class="inset-group">${gold.map(renderGoalRow).join('')}</div></section>`:'';
  return `<div class="story-stack">${purpose}${renderHero()}${renderAffirmations()}${renderIdentity()}</div>${goals}`;
}
function renderGoals(areas, gold){
  if(!areas.length)return `<section class="empty-native"><h2>Δεν υπάρχουν στόχοι</h2><button type="button" class="primary-btn" data-action="add-area">Δημιουργία πρώτου τομέα</button></section>`;
  const goldBlock=gold.length?`<section class="group"><h2 class="group-label">Χρυσοί στόχοι</h2><div class="inset-group">${gold.map(renderGoalRow).join('')}</div></section>`:'';
  const folders=areas.map(area=>{
    const metrics=metricsInArea(workspace, area.id);
    return `<section class="group"><h3 class="group-title">${esc(area.name)}</h3><div class="inset-group">${metrics.map(renderGoalRow).join('')||'<p class="row-empty">Κανένας στόχος ακόμη.</p>'}<button type="button" class="row-add" data-action="add-metric" data-area="${esc(area.id)}">Νέος στόχος</button></div></section>`;
  }).join('');
  return `${goldBlock}${folders}`;
}
function renderVisionTab(){
  return `<div class="story-stack vision-screen">${renderHero()}<button type="button" class="primary-btn" data-action="vision">Διαχείριση εικόνων</button><p class="group-foot">Οι φωτογραφίες μένουν σε αυτή τη συσκευή.</p></div>`;
}
function renderSettings(){
  const appearance=workspace.appearance;
  const directions=DIRECTIONS.map(direction=>`<button type="button" data-action="direction" data-direction="${direction}" aria-pressed="${appearance.direction===direction}">${DIRECTION_LABELS[direction]}</button>`).join('');
  return `<section class="group"><h2 class="group-label">Εμφάνιση</h2><div class="inset-group settings-card"><div class="segmented" role="group" aria-label="Πρόταση εμφάνισης">${directions}</div><label class="toggle-row"><span>Σκούρο</span><input type="checkbox" data-action="scheme-toggle" ${appearance.scheme==='dark'?'checked':''} aria-label="Σκούρο θέμα"/></label></div><p class="group-foot">Οι τρεις όψεις είναι προτάσεις. Το Σημείωμα είναι η προεπιλογή.</p></section>
  <section class="group"><h2 class="group-label">Κείμενα</h2><div class="inset-group">${[['purpose','Σκοπός'],['affirmations','Δηλώσεις'],['identity','Ταυτότητα και αποστολή'],['reminders','Υπενθυμίσεις'],['add-note','Νέα σημείωση']].map(([action,label])=>`<button type="button" class="settings-row" data-action="${action}">${label}</button>`).join('')}${workspace.notes.length?`<div class="notes-inline">${[...workspace.notes].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt.localeCompare(a.updatedAt)).map(note=>`<button type="button" class="settings-row" data-action="edit-note" data-id="${esc(note.id)}">${esc(note.title||'Χωρίς τίτλο')}</button>`).join('')}</div>`:''}</div></section>
  <section class="group"><h2 class="group-label">Δεδομένα</h2><div class="inset-group"><button type="button" class="settings-row" data-action="export">Εξαγωγή</button><button type="button" class="settings-row" data-action="import">Επαναφορά</button><button type="button" class="settings-row" data-action="load-demo">Δες ένα παράδειγμα</button><button type="button" class="settings-row danger" data-action="reset">Εκκαθάριση</button></div><p class="group-foot">Τα δεδομένα μένουν σε αυτή τη συσκευή. Δεν υπάρχει λογαριασμός ή συγχρονισμός.</p></section>`;
}
function render(){
  applyAppearance();
  const areas=orderedAreas(workspace);
  const gold=orderedGoldMetrics(workspace);
  const title=TAB_TITLES[tab]||'Σήμερα';
  const warnings=`${isStorageBlocked()?'<div class="save-warning">Τα αποθηκευμένα δεδομένα δεν διαβάζονται. Η αποθήκευση έχει κλειδωθεί· κάνε επαναφορά από τις Ρυθμίσεις.</div>':''}${saveError?`<div class="save-warning" role="alert">${esc(saveError)}</div>`:''}`;
  const action=tab==='goals'?'<button type="button" class="nav-plus" data-action="add-area" aria-label="Νέος τομέας">+</button>':tab==='vision'?'<button type="button" class="nav-plus" data-action="vision" aria-label="Επεξεργασία Vision Board">+</button>':'';
  const body=tab==='goals'?renderGoals(areas,gold):tab==='vision'?renderVisionTab():tab==='settings'?renderSettings():renderToday(areas,gold);
  root.innerHTML=`<div class="ios-app">
    <header class="nav-bar" id="nav-bar"><div class="inline-title">${esc(title)}</div>${action}</header>
    <div class="screen-scroll" id="screen-scroll"><h1 class="large-title">${esc(title)}</h1>${warnings}${body}</div>
    <nav class="tab-bar" aria-label="Κύρια">${[['today','Σήμερα'],['goals','Στόχοι'],['vision','Όραμα'],['settings','Ρυθμίσεις']].map(([id,label])=>`<button type="button" role="tab" aria-selected="${tab===id}" data-action="tab" data-tab="${id}">${tabIcon(id)}<span>${label}</span></button>`).join('')}</nav>
  </div>`;
  bindChrome();
}
function closeSheet(){
  const layer=modalRoot.querySelector('.sheet-layer');
  if(!layer){modalRoot.innerHTML='';return;}
  layer.classList.remove('open');
  setTimeout(()=>{if(!modalRoot.querySelector('.sheet-layer.open'))modalRoot.innerHTML='';},320);
}
function showDialog(inner) {
  modalRoot.innerHTML=`<div class="sheet-layer"><button type="button" class="sheet-backdrop" data-action="close" aria-label="Κλείσιμο"></button><div class="sheet" id="active-dialog" role="dialog" aria-modal="true"><div class="grabber" aria-hidden="true"></div><div class="sheet-scroll">${inner}</div></div></div>`;
  requestAnimationFrame(()=>modalRoot.querySelector('.sheet-layer')?.classList.add('open'));
  hapticImpact();
  const first=modalRoot.querySelector('input:not([type=hidden]):not([type=checkbox]),textarea');if(first)first.focus();
}
function dialogFrame(title,body,button='Αποθήκευση'){
  return `<div class="sheet-head"><h2>${title}</h2></div>${body}<div class="sheet-actions"><button type="button" data-action="close" class="outline-btn">Ακύρωση</button><button class="primary-btn" type="submit" form="entry-form">${button}</button></div>`;
}
function showAreaForm(area=null){
  showDialog(dialogFrame(area?'Επεξεργασία τομέα':'Νέος τομέας',`<form id="entry-form" data-form="area" data-id="${esc(area?.id||'')}"><label for="area-name">Όνομα φακέλου</label><input id="area-name" name="name" maxlength="80" required value="${esc(area?.name||'')}" placeholder="π.χ. Εκπαίδευση, Υγεία, Σχέσεις"/></form>${area?`<button class="danger-link" data-action="delete-area" data-id="${esc(area.id)}" type="button">Διαγραφή φακέλου και δεικτών…</button>`:''}`,area?'Αποθήκευση':'Προσθήκη'));
}
const typeNames={number:'Αριθμός',money:'Χρήματα',percentage:'Ποσοστό',boolean:'Ναι / Όχι',frequency:'Συχνότητα'};
function selectOptions(options,chosen){return options.map(([val,text])=>`<option value="${val}" ${chosen===val?'selected':''}>${text}</option>`).join('');}
function measurementFields(type, targetValue=null, actualValue=null, editing=false, existingUnit="") {
  const period=targetValue?.period||(type==='money'?'month':'week');
  const currency=targetValue?.currency||'EUR';
  const comp=document.getElementById('compare-select');if(comp)comp.closest('.field')?.classList.toggle('hidden',type==='boolean');
  return `<div class="form-grid measurement-extras">
    ${type==='number'?`<div class="field"><label for="unit">Μονάδα (προαιρετικό)</label><input name="unit" id="unit" maxlength="30" placeholder="π.χ. φίλοι" value="${esc(existingUnit)}"/></div>`:''}
    ${type==='money'?`<div class="field"><label>Νόμισμα</label><select name="currency" ${editing?'disabled':''}>${selectOptions([['EUR','Ευρώ (EUR)'],['USD','Δολάριο (USD)'],['GBP','Λίρα (GBP)']],currency)}</select></div>`:''}
    ${type==='frequency'||type==='money'?`<div class="field"><label>Περίοδος</label><select name="period" ${editing?'disabled':''}>${selectOptions([...(type==='money'?[['once','Συνολικό ποσό']]:[]),['day','Ημέρα'],['week','Εβδομάδα'],['month','Μήνας'],['year','Έτος']],period)}</select></div>`:''}
  </div><div class="form-grid values-grid">${editing?'':`<div class="field"><label for="initial">ΤΩΡΙΝΗ ΚΑΤΑΣΤΑΣΗ <small>(προαιρετικά)</small></label>${valueInput(type,'initial',actualValue,false)}</div>`}<div class="field"><label for="desired">STANDARD / ΣΤΟΧΟΣ</label>${valueInput(type,'desired',targetValue,true)}</div></div>`;
}
function valueInput(type,name,val,required){
  if(type==='boolean')return `<select name="${name}" id="${name}" ${required?'required':''}>${!required?'<option value="">Δεν έχει καταγραφεί</option>':''}<option value="yes" ${valueForInput(val)==='yes'?'selected':''}>Ναι</option><option value="no" ${valueForInput(val)==='no'?'selected':''}>Όχι</option></select>`;
  return `<div class="stepper"><button type="button" data-action="step" data-dir="-1" aria-label="Μείωση">−</button><input name="${name}" id="${name}" inputmode="decimal" ${required?'required':''} value="${esc(valueForInput(val))}" placeholder="${type==='money'?'π.χ. 2000':type==='frequency'?'π.χ. 2':'π.χ. 4'}" /><button type="button" data-action="step" data-dir="1" aria-label="Αύξηση">+</button></div>`;
}
function showMetricForm(areaId,metric=null){
  const editing=!!metric;
  const target=getTarget(metric||{})?.value;const current=getCurrent(metric||{})?.value;
  const type=metric?.type||'number';
  const areas=orderedAreas(workspace);
  showDialog(dialogFrame(editing?'Επεξεργασία στόχου':'Νέος στόχος ή standard',`<form id="entry-form" data-form="metric" data-id="${esc(metric?.id||'')}">
    <div class="field"><label for="metric-title">Τι θέλεις να παρακολουθείς;</label><input name="title" id="metric-title" required maxlength="120" value="${esc(metric?.title||'')}" placeholder="π.χ. Κοντινοί φίλοι που μπορώ να βλέπω συχνά" /></div>
    <div class="form-grid"><div class="field"><label>Φάκελος</label><select name="areaId" id="metric-area">${selectOptions(areas.map(a=>[a.id,a.name]),metric?.areaId||areaId||areas[0]?.id)}</select></div><div class="field"><label>Είδος</label><select name="kind">${selectOptions([['standard','Standard — διαρκής συνθήκη'],['goal','Στόχος — αποτέλεσμα']],metric?.kind||'standard')}</select></div></div>
    <div class="form-grid"><div class="field"><label>Τύπος μέτρησης</label><select name="type" id="metric-type" ${editing?'disabled':''}>${selectOptions(VALUE_TYPES.map(t=>[t,typeNames[t]]),type)}</select></div><div class="field ${type==='boolean'?'hidden':''}"><label>Πότε καλύπτεται;</label><select name="comparator" id="compare-select">${selectOptions([['at_least','Τουλάχιστον'],['at_most','Το πολύ'],['exact','Ακριβώς']],metric?.comparator||'at_least')}</select></div></div>
    <input type="hidden" id="metric-unit-hidden" value="${esc(metric?.unit||'')}" />
    <div id="measurement-fields">${measurementFields(type,target,current,editing,metric?.unit||'')}</div>
    ${editing?`<p class="form-hint">Η τωρινή κατάσταση αλλάζει από το κουμπί «Ενημέρωση». Κάθε αλλαγή του στόχου κρατά ιστορικό.</p><button class="danger-link" data-action="delete-metric" data-id="${esc(metric.id)}" type="button">Διαγραφή δείκτη…</button>`:'<p class="form-hint">Μπορείς να αφήσεις την τωρινή κατάσταση κενή και να την ενημερώσεις αργότερα.</p>'}
    </form>`,editing?'Αποθήκευση':'Προσθήκη'));
  if(editing) document.querySelector('#metric-area').disabled=false;
}
function showActualForm(m){const current=getCurrent(m)?.value;showDialog(dialogFrame('Ενημέρωση τωρινής κατάστασης',`<form id="entry-form" data-form="actual" data-id="${esc(m.id)}"><p class="form-desc">${esc(m.title)}</p><div class="field"><label for="current-input">Τωρινή κατάσταση</label>${valueInput(m.type,'current-input',current,true)}</div><p class="form-hint">Προστίθεται νέα καταγραφή στο ιστορικό. Οι παλιές τιμές δεν διαγράφονται.</p></form>`,'Καταγραφή'));}
function showAffirmationForm(){
  const list=orderedAffirmations(workspace);
  const rows=list.map((item,index)=>`<li><b>${esc(item.text)}</b><span><button type="button" data-action="move-affirmation" data-id="${esc(item.id)}" data-dir="-1" ${index===0?'disabled':''} aria-label="Πάνω">↑</button><button type="button" data-action="move-affirmation" data-id="${esc(item.id)}" data-dir="1" ${index===list.length-1?'disabled':''} aria-label="Κάτω">↓</button><button type="button" class="danger-link" data-action="delete-affirmation" data-id="${esc(item.id)}">Αφαίρεση</button></span></li>`).join('');
  showDialog(dialogFrame('Δηλώσεις',`<form id="entry-form" data-form="affirmation"><label class="check-line"><input type="checkbox" name="show" ${workspace.appearance.showAffirmations?'checked':''}/> Να φαίνονται στο dashboard</label><ul class="history-list">${rows||'<li>Καμία δήλωση</li>'}</ul><div class="field"><label for="affirmation-text">Νέα δήλωση</label><input id="affirmation-text" name="text" maxlength="180" placeholder="Μια σύντομη φράση που διαλέγεις εσύ"/></div></form>`,'Αποθήκευση'));
}
function showIdentityForm(){
  const fields=workspace.identity.sections.map(section=>`<fieldset class="identity-fields"><legend>${esc(section.eyebrow)}</legend><label class="check-line"><input type="checkbox" name="visible-${section.key}" ${section.visible?'checked':''}/> Να φαίνεται</label><div class="field"><label>Μικρός τίτλος</label><input name="eyebrow-${section.key}" maxlength="80" value="${esc(section.eyebrow)}"/></div><div class="field"><label>Επικεφαλίδα</label><input name="title-${section.key}" maxlength="120" value="${esc(section.title)}"/></div><div class="field"><label>Κείμενο</label><textarea name="body-${section.key}" rows="2" maxlength="400">${esc(section.body)}</textarea></div><div class="field"><label>Κουμπιά, χωρισμένα με κόμμα</label><input name="chips-${section.key}" maxlength="180" value="${esc(section.chips.map(chip=>chip.label).join(', '))}"/></div></fieldset>`).join('');
  showDialog(dialogFrame('Ταυτότητα και αποστολή',`<form id="entry-form" data-form="identity"><label class="check-line"><input type="checkbox" name="show" ${workspace.appearance.showIdentity?'checked':''}/> Να φαίνεται η κάρτα</label>${fields}</form>`));
}
function showPurposeForm(){showDialog(dialogFrame('Ο προσωπικός μου σκοπός',`<form id="entry-form" data-form="purpose"><div class="field"><label for="purpose-text">Πώς θέλεις να ορίζεις τον σκοπό σου;</label><textarea name="text" id="purpose-text" rows="5" maxlength="1000" placeholder="Γράψε τον προσωπικό σου σκοπό...">${esc(workspace.purpose.text)}</textarea></div><label class="check-line"><input type="checkbox" name="visible" ${workspace.purpose.visible?'checked':''} /> Να εμφανίζεται στο dashboard</label></form>`));}
function showHistory(m){const actual=[...m.observations].reverse().map(o=>`<li><b>${valueLabel(o.value,m)}</b><span>${dateLabel(o.observedAt)}</span></li>`).join('');const targets=[...m.targets].reverse().map(t=>`<li><b>${valueLabel(t.value,m)}</b><span>${dateLabel(t.effectiveAt)}</span></li>`).join('');showDialog(`<div class="dialog-head"><div><span class="eyebrow">ΙΣΤΟΡΙΚΟ</span><h2>${esc(m.title)}</h2></div><button type="button" data-action="close" class="icon-btn">✕</button></div><div class="history-grid"><div><h3>Καταγραφές τωρινής κατάστασης</h3><ul class="history-list">${actual||'<li>Καμία καταγραφή</li>'}</ul></div><div><h3>Αλλαγές standards / στόχων</h3><ul class="history-list">${targets||'<li>Κανένας στόχος</li>'}</ul></div></div><div class="dialog-actions"><button type="button" class="outline-btn" data-action="close">Κλείσιμο</button></div>`);}
async function repositionArea(id,dir){const sorted=orderedAreas(workspace),i=sorted.findIndex(a=>a.id===id),other=sorted[i+dir];if(i<0||!other)return; const x=sorted[i]; const original=x.order;x.order=other.order;other.order=original; if(x.order===other.order){sorted.forEach((a,j)=>a.order=j);const tmp=sorted[i];sorted[i]=sorted[i+dir];sorted[i+dir]=tmp;sorted.forEach((a,j)=>a.order=j);}await commit('Η σειρά των τομέων ενημερώθηκε');}

document.addEventListener('click',async event=>{
  if(ignoreClick){ignoreClick=false;return;}
  const settingsMenu=document.querySelector('.settings-popover[open]');
  if(settingsMenu&&!settingsMenu.contains(event.target))settingsMenu.open=false;
  const b=event.target.closest('[data-action]');if(!b)return;
  const action=b.dataset.action,id=b.dataset.id;
  try{
    if(action==='toggle-metric'){
      const card=b.closest('.compact-card'), detail=card?.querySelector('.compact-details');
      if(!detail)return;
      detail.hidden=!detail.hidden;
      b.setAttribute('aria-expanded',String(!detail.hidden));
      card.classList.toggle('expanded',!detail.hidden);
      return;
    }
    if(action==='toggle-order'){ordering=!ordering;render();return;}
    if(action==='move-metric'){if(moveMetric(workspace,id,Number(b.dataset.dir),b.dataset.collection))await commit('Η σειρά ενημερώθηκε');return;}
    if(action==='close'){closeSheet();return;}
    if(action==='tab'){if(TAB_TITLES[b.dataset.tab]){tab=b.dataset.tab;hapticImpact();render();}return;}
    if(action==='step'){const input=b.parentElement?.querySelector('input');if(!input)return;const current=Number(String(input.value).replace(',','.'));const base=Number.isFinite(current)?current:0;const next=Math.round((base+Number(b.dataset.dir))*100)/100;input.value=String(next);hapticImpact();return;}
    if(action==='navigate'){view=b.dataset.view;render();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(action==='add-area')return showAreaForm();
    if(action==='delete-area'){const a=areaById(id);if(!a||!confirm(`Να διαγραφεί ο φάκελος «${a.name}» και όλοι οι δείκτες του; Δεν μπορεί να αναιρεθεί.`))return;workspace.areas=workspace.areas.filter(x=>x.id!==id);workspace.metrics=workspace.metrics.filter(x=>x.areaId!==id);if(view===id)view='all';closeSheet();return await commit('Ο φάκελος διαγράφηκε.');}
    if(action==='delete-metric'){const m=metricById(id);if(!m||!confirm(`Να διαγραφεί ο δείκτης «${m.title}» και το ιστορικό του; Δεν μπορεί να αναιρεθεί.`))return;workspace.metrics=workspace.metrics.filter(x=>x.id!==id);closeSheet();return await commit('Ο δείκτης διαγράφηκε.');}
    if(action==='edit-area')return showAreaForm(areaById(id));
    if(action==='move-area')return repositionArea(id,Number(b.dataset.dir));
    if(action==='add-metric')return showMetricForm(b.dataset.area);
    if(action==='edit-metric')return showMetricForm(metricById(id)?.areaId,metricById(id));
    if(action==='update')return showActualForm(metricById(id));
    if(action==='history')return showHistory(metricById(id));
    if(action==='purpose')return showPurposeForm();
    if(action==='add-note')return showNoteForm();
    if(action==='vision')return showVisionForm();
    if(action==='reminders')return showReminderForm();
    if(action==='direction'){if(!DIRECTIONS.includes(b.dataset.direction))return;workspace.appearance.direction=b.dataset.direction;return await commit('Η πρόταση εμφάνισης άλλαξε.');}
    if(action==='scheme'){workspace.appearance.scheme=workspace.appearance.scheme==='dark'?'light':'dark';return await commit(workspace.appearance.scheme==='dark'?'Σκούρο θέμα.':'Φωτεινό θέμα.');}
    if(action==='affirmations')return showAffirmationForm();
    if(action==='identity')return showIdentityForm();
    if(action==='move-affirmation'){if(moveAffirmation(workspace,id,Number(b.dataset.dir))){if(await commit('Η σειρά των δηλώσεων άλλαξε.'))showAffirmationForm();}return;}
    if(action==='delete-affirmation'){if(!confirm('Να αφαιρεθεί η δήλωση;'))return;workspace.affirmations=workspace.affirmations.filter(item=>item.id!==id);if(await commit('Η δήλωση αφαιρέθηκε.'))showAffirmationForm();return;}
    if(action==='delete-reminder'){if(!confirm('Να αφαιρεθεί η υπενθύμιση;'))return;await persistReminders(reminders.filter(r=>r.id!==id),'Η υπενθύμιση αφαιρέθηκε.');return;}
    if(action==='delete-image'){if(!confirm('Αφαίρεση φωτογραφίας;'))return;workspace.vision.images=workspace.vision.images.filter(i=>i.id!==id);if(await commit('Η φωτογραφία αφαιρέθηκε.'))showVisionForm();else closeSheet();return;}
    if(action==='edit-note')return showNoteForm(noteById(id));
    if(action==='delete-note'){if(!confirm('Να διαγραφεί η σημείωση;'))return;workspace.notes=workspace.notes.filter(n=>n.id!==id);closeSheet();return await commit();}
    if(action==='import'){document.getElementById('backup-file')?.click();return;}
    if(action==='gold'){const m=metricById(id);if(m){m.gold=!m.gold;if(m.gold)m.goldOrder=orderedGoldMetrics(workspace).length;else delete m.goldOrder;await commit(m.gold?'Προστέθηκε στους χρυσούς στόχους':'Αφαιρέθηκε από χρυσούς στόχους');}return;}
    if(action==='export'){const menu=document.querySelector('.settings-popover');if(menu)menu.open=false;exportWorkspace(workspace);return toast('Το JSON αντίγραφο δημιουργήθηκε.');}
    if(action==='load-demo'){if(workspace.areas.length&&!confirm('Να αντικατασταθούν οι τωρινοί τοπικοί δείκτες με ενδεικτικά δεδομένα;'))return;workspace=demoWorkspace();view='all';return await commit('Φορτώθηκαν φανταστικά δεδομένα παραδείγματος.');}
    if(action==='reset'){if(!confirm('Να διαγραφούν ΟΛΑ τα δεδομένα αυτού του browser; Κάνε πρώτα εξαγωγή αν τα χρειάζεσαι.'))return;workspace={version:1,areas:[],metrics:[],purpose:{text:'',visible:true}};view='all';tab='today';return await commit('Καθαρίστηκαν τα τοπικά δεδομένα.');}
  }catch(e){toast(e.message||'Προέκυψε σφάλμα.',true);}
});
document.addEventListener('change',e=>{
  if(e.target?.dataset?.action==='scheme-toggle'){workspace.appearance.scheme=e.target.checked?'dark':'light';commit(e.target.checked?'Σκούρο θέμα.':'Φωτεινό θέμα.');return;}
  if(e.target.id==='metric-type'){
    const type=e.target.value;
    const holder=document.getElementById('measurement-fields');
    if(holder)holder.innerHTML=measurementFields(type);
  }
});
document.addEventListener('change',async e=>{
 if(e.target.id!=='backup-file')return;
 const file=e.target.files?.[0];e.target.value='';
 if(!file)return;
 try{
  if(file.size>5_000_000)throw new Error('Το backup ξεπερνά τα 5 MB.');
  const text=await file.text();
  parseBackup(text);
  if(!confirm('Η επαναφορά θα αντικαταστήσει όλα τα τοπικά δεδομένα. Συνέχεια;'))return;
  workspace=await Promise.resolve(importWorkspace(text));
  lastSaved=structuredClone(workspace);
  normalizeMetricOrders(workspace);
  view='all';commit('Το backup επαναφέρθηκε.');
 }catch(error){toast(error.message||'Το backup απορρίφθηκε.',true);}
});
document.addEventListener('change',async event=>{
 if(event.target.id!=='vision-file')return;
 const file=event.target.files?.[0];event.target.value='';
 if(!file)return;
 try{
  if(workspace.vision.images.length>=8)throw new Error('Μέχρι 8 φωτογραφίες.');
  const dataUrl=await compressVisionPhoto(file);
  workspace.vision.images=[...workspace.vision.images,{id:crypto.randomUUID(),title:cleanText(file.name.replace(/\.[^.]+$/,''),120),createdAt:new Date().toISOString(),dataUrl}];
  if(await commit('Η φωτογραφία προστέθηκε.'))showVisionForm();
  else closeSheet();
 }catch(error){toast(error.message||'Αποτυχία εισαγωγής εικόνας.',true);}
});
setInterval(()=>{
 const image=document.querySelector('.vision-photo');
 const updated=currentVisionImage(workspace.vision);
 if(image&&updated&&image.src!==updated.dataUrl)image.src=updated.dataUrl;
},60_000);
document.addEventListener('submit',async e=>{
  const form=e.target;if(form.id!=='entry-form')return;e.preventDefault();
  const data=new FormData(form);const id=form.dataset.id;
  try{
    if(form.dataset.form==='area'){
      const name=cleanText(data.get('name'),80);if(!name)throw new Error('Συμπλήρωσε όνομα τομέα.');
      if(id){const a=areaById(id);if(!a)throw new Error('Δεν βρέθηκε ο φάκελος.');a.name=name;}
      else {workspace.areas.push(createArea(name,workspace.areas.length));tab='goals';}
    }
    else if(form.dataset.form==='metric'){
      const raw={title:data.get('title'),kind:data.get('kind'),areaId:data.get('areaId'),type:data.get('type')||metricById(id)?.type,comparator:data.get('comparator')||'at_least',unit:data.get('unit')||'',desired:data.get('desired'),initial:data.get('initial'),currency:data.get('currency')||'EUR',period:data.get('period')||'week'};
      if(!areaById(raw.areaId))throw new Error('Διάλεξε έγκυρο φάκελο.');
      if(id){const old=metricById(id);if(!old)throw new Error('Δεν βρέθηκε ο δείκτης.');const changed=changeTarget(old,raw.desired,raw);changed.areaId=raw.areaId;workspace.metrics=workspace.metrics.map(m=>m.id===id?changed:m);}
      else workspace.metrics.push(createMetric(raw));
    }
    else if(form.dataset.form==='actual'){
      const m=metricById(id);if(!m)throw new Error('Δεν βρέθηκε ο δείκτης.');
      const changed=addObservation(m,data.get('current-input'));workspace.metrics=workspace.metrics.map(x=>x.id===id?changed:x);
    }
    else if(form.dataset.form==='purpose')workspace.purpose={text:cleanText(data.get('text'),1000),visible:data.get('visible')==='on'};
    else if(form.dataset.form==='affirmation'){
      workspace.appearance.showAffirmations=data.get('show')==='on';
      const text=cleanText(data.get('text'),180);
      if(text){
        if(workspace.affirmations.length>=12)throw new Error('Μέχρι 12 δηλώσεις.');
        workspace.affirmations.push({id:crypto.randomUUID(),text,order:workspace.affirmations.length});
      }
    }
    else if(form.dataset.form==='identity'){
      workspace.appearance.showIdentity=data.get('show')==='on';
      workspace.identity.visible=true;
      for(const section of workspace.identity.sections){
        section.visible=data.get(`visible-${section.key}`)==='on';
        section.eyebrow=cleanText(data.get(`eyebrow-${section.key}`),80)||section.eyebrow;
        section.title=cleanText(data.get(`title-${section.key}`),120);
        section.body=cleanText(data.get(`body-${section.key}`),400);
        section.chips=String(data.get(`chips-${section.key}`)||'').split(',').map(part=>cleanText(part,24)).filter(Boolean).slice(0,6).map(label=>({id:crypto.randomUUID(),label}));
      }
    }
    else if(form.dataset.form==='vision')workspace.vision={...workspace.vision,visible:data.get('visible')==='on',mode:data.get('mode')==='rotate'?'rotate':'fixed',rotationHours:Number(data.get('rotationHours'))};
    else if(form.dataset.form==='note'){
      const now=new Date().toISOString(),old=noteById(id);
      const next={id:old?.id||crypto.randomUUID(),title:cleanText(data.get('title'),120),body:cleanText(data.get('body'),4000),pinned:data.get('pinned')==='on',createdAt:old?.createdAt||now,updatedAt:now};
      if(!next.title&&!next.body)throw new Error('Γράψε κείμενο ή τίτλο.');
      workspace.notes=old?workspace.notes.map(n=>n.id===id?next:n):[...workspace.notes,next];view='notes';
    }
    else if(form.dataset.form==='reminder'){
      if(reminders.length>=8) throw new Error('Μέχρι 8 υπενθυμίσεις.');
      const [hour,minute]=String(data.get('time')||'').split(':').map(Number);
      const next=reminderFromInput({id:crypto.randomUUID(),text:data.get('text'),hour,minute,notificationId:nextNotificationId(reminders)});
      closeSheet();
      await persistReminders([...reminders,next]);
      return;
    }
    else return;
    closeSheet();await commit();
  }catch(error){toast(error.message||'Έλεγξε τις τιμές που συμπλήρωσες.',true);}
});
render();
requestPersistentStorage();
applyPreviewFixture();
async function applyPreviewFixture(){
  try{
    const response=await fetch(new URL('../preview.json', import.meta.url),{cache:'no-store'});
    if(!response.ok)return;
    const spec=await response.json();
    if(!spec?.screen)return;
    workspace=demoWorkspace();
    normalizeWorkspace(workspace);
    normalizeMetricOrders(workspace);
    lastSaved=structuredClone(workspace);
    tab=spec.screen==='settings'?'settings':'today';
    render();
    if(spec.screen==='sheet'&&workspace.metrics[0])showActualForm(workspace.metrics[0]);
  }catch{/* Normal launch has no preview file. */}
}
async function requestPersistentStorage(){
  try{
    const storage=navigator.storage;
    if(!storage?.persist)return;
    const already=storage.persisted?await storage.persisted():false;
    if(!already)await storage.persist();
  }catch(error){
    console.warn('It Works: persistent storage was not granted.',error);
  }
}
if('serviceWorker' in navigator && location.protocol !== 'file:' && !window.Capacitor?.isNativePlatform?.()){
  // A new service worker takes control without retaining the previous offline shell.
  // Reload only once per tab when the controller actually changes.
  let refreshed=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(refreshed)return;
    refreshed=true;
    window.location.reload();
  });
  window.addEventListener('load',async ()=>{
    try {
      const reg=await navigator.serviceWorker.register(new URL('../sw.js?v=20261103-native-v11', import.meta.url),{updateViaCache:'none'});
      await reg.update();
    } catch(error) {
      console.warn('Offline shell update unavailable:',error);
    }
  });
}
