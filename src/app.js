import {addObservation,changeTarget,cleanText,compareMetric,createArea,createMetric,demoWorkspace,describeGap,formatValue,getCurrent,getTarget,metricsInArea,orderedAreas,orderedGoldMetrics,normalizeMetricOrders,moveMetric,metricProgress,VALUE_TYPES} from './domain.js?v=20261103-capacitor-v9';
import {exportWorkspace,importWorkspace,initStorage,isStorageBlocked,loadReminders,loadWorkspace,saveReminders,saveWorkspace} from './storage.js?v=20261103-capacitor-v9';
import {parseBackup} from './backup.js?v=20261103-capacitor-v9';
import {currentVisionImage,compressVisionPhoto} from './vision.js?v=20261103-capacitor-v9';
import {commitWorkspace,SAVE_ROLLBACK_MESSAGE} from './persist.js?v=20261103-capacitor-v9';
import {applyReminderSchedule,canScheduleNatively,nextNotificationId,reminderFromInput,sanitizeReminders} from './reminders.js?v=20261103-capacitor-v9';
import {goldWidgetSnapshot} from './widget-snapshot.js?v=20261103-capacitor-v9';

await initStorage();
let workspace = loadWorkspace();
workspace.notes ??=[];
workspace.vision ??={visible:false,mode:'fixed',rotationHours:3,images:[]};
let view = 'all';
let ordering = false;
normalizeMetricOrders(workspace);
let lastSaved = structuredClone(workspace);
let reminders = sanitizeReminders(loadReminders());
let saveError = '';
let toastTimer;
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
async function commit(message='Αποθηκεύτηκε σε αυτή τη συσκευή') {
  normalizeMetricOrders(workspace);
  const result=await Promise.resolve(commitWorkspace(workspace, lastSaved, saveWorkspace));
  workspace=result.workspace;
  saveError=result.ok?'':result.message;
  if(result.ok){lastSaved=structuredClone(workspace);publishWidget(workspace);}
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
    <div class="compact-values"><span><small>ΤΩΡΑ</small><strong>${currentText}</strong></span><span><small>STANDARD / ΣΤΟΧΟΣ</small><strong>${targetText}</strong></span></div>
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
function render(){
  const areas=orderedAreas(workspace);
  const selectedArea=areaById(view);
  const gold=orderedGoldMetrics(workspace);
  const showGold=view==='all' && gold.length;
  const visibleAreas=selectedArea?[selectedArea]:['gold','notes'].includes(view)?[]:areas;
  const title=selectedArea?selectedArea.name:view==='gold'?'Χρυσοί στόχοι':view==='notes'?'Σημειώσεις':'Η συνολική μου εικόνα';
  root.innerHTML=`<div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-icon">✦</div><div><b>it works<span>.</span></b><small>LIFE TRACKER</small></div></div>
      <div class="nav-section-label">Ο ΧΩΡΟΣ ΜΟΥ</div>
      <nav aria-label="Τομείς ζωής"><button class="nav-item ${view==='all'?'active':''}" data-action="navigate" data-view="all"><span>◫</span> Συνολική εικόνα</button><button class="nav-item ${view==='gold'?'active':''}" data-action="navigate" data-view="gold"><span class="gold-icon">★</span> Χρυσοί στόχοι</button></nav>
      <div class="nav-divider"></div><button class="nav-item ${view==='notes'?'active':''}" data-action="navigate" data-view="notes">✎ Σημειώσεις</button><div class="side-heading"><span>ΟΙ ΤΟΜΕΙΣ ΜΟΥ</span><button data-action="add-area" class="side-add" title="Νέος φάκελος" aria-label="Νέος φάκελος">＋</button></div>
      <nav aria-label="Προσωπικοί φάκελοι">${areas.map(a=>`<button class="nav-item ${view===a.id?'active':''}" data-action="navigate" data-view="${esc(a.id)}"><span class="area-dot" style="background:${escapeAttrColor(a.color)}"></span><span class="nav-name">${esc(a.name)}</span></button>`).join('')}${areas.length?'':'<div class="sidebar-empty">Ξεκίνα προσθέτοντας έναν τομέα.</div>'}</nav>
      <div class="sidebar-bottom"><span class="local-dot"></span><div><b>Local Preview</b><small>Χωρίς λογαριασμό ή cloud sync</small></div></div>
    </aside>
    <main class="main-content">
      <header class="topbar"><div class="topbar-brand">IT WORKS <span>/ LIFE TRACKER</span></div><div class="topbar-actions"><details class="settings-popover"><summary class="settings-toggle ${ordering?'settings-active':''}" aria-label="Ρυθμίσεις" title="Ρυθμίσεις"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.542-.94 3.308.826 2.368 2.368a1.724 1.724 0 0 0 1.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.542-.826 3.308-2.368 2.368a1.724 1.724 0 0 0-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.542.94-3.308-.826-2.368-2.368a1.724 1.724 0 0 0-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.542.826-3.308 2.368-2.368a1.724 1.724 0 0 0 2.573-1.066Z"/><circle cx="12" cy="12" r="3"/></svg></summary><div class="settings-panel"><button type="button" data-action="toggle-order">${ordering?'Τέλος αλλαγής σειράς':'Αλλαγή σειράς'}</button><button type="button" data-action="export">Εξαγωγή δεδομένων</button><button type="button" data-action="import">Επαναφορά backup</button><button type="button" data-action="add-note">Νέα σημείωση</button><button type="button" data-action="vision">Vision Board</button><button type="button" data-action="reminders">Υπενθυμίσεις</button></div></details></div></header>
      <div class="content-wrap">
        <div class="page-heading"><h1>${esc(title)}</h1></div>${view==='all'?renderVision():''}${isStorageBlocked()?'<div class="save-warning">Τα αποθηκευμένα δεδομένα δεν διαβάζονται. Η αποθήκευση έχει κλειδωθεί· κάνε επαναφορά backup από τις ρυθμίσεις.</div>':''}${saveError?`<div class="save-warning" role="alert">${esc(saveError)}</div>`:''}
        ${view==='all'?`${workspace.purpose.visible && workspace.purpose.text?`<section class="purpose-card"><div><div class="purpose-eyebrow">✦ Ο ΣΚΟΠΟΣ ΜΟΥ</div><p>${esc(workspace.purpose.text)}</p></div><button class="purpose-edit" data-action="purpose" aria-label="Επεξεργασία σκοπού">✎</button></section>`:`<button class="purpose-placeholder" data-action="purpose">✦ ${workspace.purpose.text?'Εμφάνισε ξανά τον σκοπό μου':'Πρόσθεσε τον προσωπικό σου σκοπό'} <span>＋</span></button>`}
        `:''}
        ${showGold?`<section class="gold-section"><div class="section-heading"><div><h2>Οι χρυσοί στόχοι μου</h2></div><button class="text-btn" data-action="navigate" data-view="gold">Προβολή όλων →</button></div><div class="gold-grid">${gold.slice(0,3).map((m,i)=>renderMetric(m,true,'gold',i,gold.length)).join('')}</div></section>`:''}
        ${view==='notes'?renderNotes():''}
        ${view==='gold'?`${gold.length?`<div class="gold-grid">${gold.map((m,i)=>renderMetric(m,true,'gold',i,gold.length)).join('')}</div>`:'<section class="empty-panel"><span class="empty-art">☆</span><h2>Δεν έχεις επιλέξει χρυσούς στόχους</h2><p>Πάτησε το αστέρι σε έναν δείκτη για να εμφανίζεται εδώ.</p><button class="primary-btn" data-action="navigate" data-view="all">Πίσω στους τομείς</button></section>'}`:''}
        ${!['gold','notes'].includes(view)?`<section class="areas-section"><div class="section-heading"><div><h2>${selectedArea?'Standards & στόχοι':'Οι τομείς της ζωής μου'}</h2></div><button class="outline-btn" data-action="add-area"><span>＋</span> Νέος τομέας</button></div>
        ${visibleAreas.length?`<div class="areas-stack">${visibleAreas.map(renderArea).join('')}</div>`:`<section class="empty-panel"><span class="empty-art">▦</span><h2>Η ζωή σου, οι δικοί σου τομείς</h2><p>Δημιούργησε τους φακέλους που θέλεις. Μέσα σε κάθε έναν θα βάζεις το δικό σου standard και πού βρίσκεσαι σήμερα.</p><div class="empty-actions"><button class="primary-btn" data-action="add-area">＋ Δημιουργία πρώτου τομέα</button><button class="outline-btn" data-action="load-demo">Δες ένα παράδειγμα</button></div></section>`}</section>`:''}
        
        <footer class="footnote"><b>Προσοχή:</b> αυτή είναι τοπική δοκιμαστική έκδοση. Τα δεδομένα μένουν μόνο στον συγκεκριμένο browser, χωρίς σύνδεση, κρυπτογράφηση λογαριασμού ή συγχρονισμό. Απόφυγε ευαίσθητα προσωπικά στοιχεία προς το παρόν. <button data-action="export">Εξαγωγή JSON</button> <button data-action="reset">Εκκαθάριση</button></footer>
      </div>
    </main>
  </div>`;
}
function showDialog(inner) {
  modalRoot.innerHTML=`<dialog class="app-dialog" id="active-dialog"><div class="dialog-content">${inner}</div></dialog>`;
  const dialog=document.getElementById('active-dialog');dialog.showModal();
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{modalRoot.innerHTML='';});
  const first=dialog.querySelector('input:not([type=hidden]),textarea');if(first)first.focus();
}
function dialogFrame(title,body,button='Αποθήκευση'){
  return `<div class="dialog-head"><div><span class="eyebrow">IT WORKS</span><h2>${title}</h2></div><button type="button" data-action="close" class="icon-btn" aria-label="Κλείσιμο">✕</button></div>${body}<div class="dialog-actions"><button type="button" data-action="close" class="outline-btn">Ακύρωση</button><button class="primary-btn" type="submit" form="entry-form">${button}</button></div>`;
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
  return `<input name="${name}" id="${name}" inputmode="decimal" ${required?'required':''} value="${esc(valueForInput(val))}" placeholder="${type==='money'?'π.χ. 2000':type==='frequency'?'π.χ. 2':'π.χ. 4'}" />`;
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
function showPurposeForm(){showDialog(dialogFrame('Ο προσωπικός μου σκοπός',`<form id="entry-form" data-form="purpose"><div class="field"><label for="purpose-text">Πώς θέλεις να ορίζεις τον σκοπό σου;</label><textarea name="text" id="purpose-text" rows="5" maxlength="1000" placeholder="Γράψε τον προσωπικό σου σκοπό...">${esc(workspace.purpose.text)}</textarea></div><label class="check-line"><input type="checkbox" name="visible" ${workspace.purpose.visible?'checked':''} /> Να εμφανίζεται στο dashboard</label></form>`));}
function showHistory(m){const actual=[...m.observations].reverse().map(o=>`<li><b>${valueLabel(o.value,m)}</b><span>${dateLabel(o.observedAt)}</span></li>`).join('');const targets=[...m.targets].reverse().map(t=>`<li><b>${valueLabel(t.value,m)}</b><span>${dateLabel(t.effectiveAt)}</span></li>`).join('');showDialog(`<div class="dialog-head"><div><span class="eyebrow">ΙΣΤΟΡΙΚΟ</span><h2>${esc(m.title)}</h2></div><button type="button" data-action="close" class="icon-btn">✕</button></div><div class="history-grid"><div><h3>Καταγραφές τωρινής κατάστασης</h3><ul class="history-list">${actual||'<li>Καμία καταγραφή</li>'}</ul></div><div><h3>Αλλαγές standards / στόχων</h3><ul class="history-list">${targets||'<li>Κανένας στόχος</li>'}</ul></div></div><div class="dialog-actions"><button type="button" class="outline-btn" data-action="close">Κλείσιμο</button></div>`);}
async function repositionArea(id,dir){const sorted=orderedAreas(workspace),i=sorted.findIndex(a=>a.id===id),other=sorted[i+dir];if(i<0||!other)return; const x=sorted[i]; const original=x.order;x.order=other.order;other.order=original; if(x.order===other.order){sorted.forEach((a,j)=>a.order=j);const tmp=sorted[i];sorted[i]=sorted[i+dir];sorted[i+dir]=tmp;sorted.forEach((a,j)=>a.order=j);}await commit('Η σειρά των τομέων ενημερώθηκε');}

document.addEventListener('click',async event=>{
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
    if(action==='close'){document.getElementById('active-dialog')?.close();return;}
    if(action==='navigate'){view=b.dataset.view;render();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(action==='add-area')return showAreaForm();
    if(action==='delete-area'){const a=areaById(id);if(!a||!confirm(`Να διαγραφεί ο φάκελος «${a.name}» και όλοι οι δείκτες του; Δεν μπορεί να αναιρεθεί.`))return;workspace.areas=workspace.areas.filter(x=>x.id!==id);workspace.metrics=workspace.metrics.filter(x=>x.areaId!==id);if(view===id)view='all';document.getElementById('active-dialog')?.close();return await commit('Ο φάκελος διαγράφηκε.');}
    if(action==='delete-metric'){const m=metricById(id);if(!m||!confirm(`Να διαγραφεί ο δείκτης «${m.title}» και το ιστορικό του; Δεν μπορεί να αναιρεθεί.`))return;workspace.metrics=workspace.metrics.filter(x=>x.id!==id);document.getElementById('active-dialog')?.close();return await commit('Ο δείκτης διαγράφηκε.');}
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
    if(action==='delete-reminder'){if(!confirm('Να αφαιρεθεί η υπενθύμιση;'))return;await persistReminders(reminders.filter(r=>r.id!==id),'Η υπενθύμιση αφαιρέθηκε.');return;}
    if(action==='delete-image'){if(!confirm('Αφαίρεση φωτογραφίας;'))return;workspace.vision.images=workspace.vision.images.filter(i=>i.id!==id);if(await commit('Η φωτογραφία αφαιρέθηκε.'))showVisionForm();else document.getElementById('active-dialog')?.close();return;}
    if(action==='edit-note')return showNoteForm(noteById(id));
    if(action==='delete-note'){if(!confirm('Να διαγραφεί η σημείωση;'))return;workspace.notes=workspace.notes.filter(n=>n.id!==id);document.getElementById('active-dialog')?.close();return await commit();}
    if(action==='import'){document.getElementById('backup-file')?.click();return;}
    if(action==='gold'){const m=metricById(id);if(m){m.gold=!m.gold;if(m.gold)m.goldOrder=orderedGoldMetrics(workspace).length;else delete m.goldOrder;await commit(m.gold?'Προστέθηκε στους χρυσούς στόχους':'Αφαιρέθηκε από χρυσούς στόχους');}return;}
    if(action==='export'){const menu=document.querySelector('.settings-popover');if(menu)menu.open=false;exportWorkspace(workspace);return toast('Το JSON αντίγραφο δημιουργήθηκε.');}
    if(action==='load-demo'){if(workspace.areas.length&&!confirm('Να αντικατασταθούν οι τωρινοί τοπικοί δείκτες με ενδεικτικά δεδομένα;'))return;workspace=demoWorkspace();view='all';return await commit('Φορτώθηκαν φανταστικά δεδομένα παραδείγματος.');}
    if(action==='reset'){if(!confirm('Να διαγραφούν ΟΛΑ τα δεδομένα αυτού του browser; Κάνε πρώτα εξαγωγή αν τα χρειάζεσαι.'))return;workspace={version:1,areas:[],metrics:[],purpose:{text:'',visible:true}};view='all';return await commit('Καθαρίστηκαν τα τοπικά δεδομένα.');}
  }catch(e){toast(e.message||'Προέκυψε σφάλμα.',true);}
});
document.addEventListener('change',e=>{
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
  else document.getElementById('active-dialog')?.close();
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
      else workspace.areas.push(createArea(name,workspace.areas.length));
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
      document.getElementById('active-dialog')?.close();
      await persistReminders([...reminders,next]);
      return;
    }
    else return;
    document.getElementById('active-dialog')?.close();await commit();
  }catch(error){toast(error.message||'Έλεγξε τις τιμές που συμπλήρωσες.',true);}
});
render();
requestPersistentStorage();
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
      const reg=await navigator.serviceWorker.register(new URL('../sw.js?v=20261103-capacitor-v9', import.meta.url),{updateViaCache:'none'});
      await reg.update();
    } catch(error) {
      console.warn('Offline shell update unavailable:',error);
    }
  });
}
