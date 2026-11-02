import {addObservation,changeTarget,cleanText,compareMetric,createArea,createMetric,demoWorkspace,describeGap,formatValue,getCurrent,getTarget,metricsInArea,orderedAreas,metricProgress,VALUE_TYPES} from './domain.js';
import {exportWorkspace,loadWorkspace,saveWorkspace} from './storage.js';

let workspace = loadWorkspace();
let view = 'all';
let toastTimer;
const root = document.getElementById('root');
const modalRoot = document.getElementById('modal-root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = (iso) => iso ? new Intl.DateTimeFormat('el-GR',{dateStyle:'medium'}).format(new Date(iso)) : '—';
const label = (m) => m.kind === 'goal' ? 'Στόχος' : 'Standard';
const statusName = {met:'Επιτεύχθηκε',unmet:'Σε εξέλιξη',unknown:'Δεν έχει καταγραφεί',incompatible:'Ασυμβατό',not_configured:'Χωρίς στόχο'};
const metricById = id => workspace.metrics.find(m => m.id === id);
const areaById = id => workspace.areas.find(a => a.id === id);
function toast(message, error=false) {
  const el=document.getElementById('toast');el.textContent=message;el.className=error?'show error':'show';
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='',4500);
}
function commit(message='Αποθηκεύτηκε σε αυτή τη συσκευή') {
  const ok=saveWorkspace(workspace);render();toast(ok?message:'Δεν αποθηκεύτηκε στη συσκευή — κάνε εξαγωγή για αντίγραφο.',!ok);
}
function escapeAttrColor(color){return /^#[0-9a-fA-F]{6}$/.test(String(color))?color:'#7067cf';}
function valueForInput(value){return !value?'':value.type==='boolean'?(value.value?'yes':'no'):String(value.amount);}
function valueLabel(value,metric){return value?`${formatValue(value)}${value.type==='number'&&metric.unit?' '+esc(metric.unit):''}`:'Δεν έχει καταγραφεί';}
function getCounts(){const comparisons=workspace.metrics.map(compareMetric);return {areas:workspace.areas.length,metrics:workspace.metrics.length,met:comparisons.filter(x=>x.status==='met').length,unknown:comparisons.filter(x=>x.status==='unknown').length};}

function renderMetric(metric, condensed=false) {
  const result=compareMetric(metric), actual=result.actual?.value, target=result.target?.value;
  const progress=metricProgress(metric,result);
  const active=['met','unmet'].includes(result.status);
  const currentText=valueLabel(actual,metric), targetText=valueLabel(target,metric);
  const progressMarkup=progress
    ? `<div class="compact-track" role="progressbar" aria-label="${esc(metric.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.filled}" aria-valuetext="${esc(currentText)} από ${esc(targetText)}"><span style="width:${progress.filled}%"></span></div><div class="compact-percent">${new Intl.NumberFormat('el-GR',{maximumFractionDigits:1}).format(progress.percentage)}%</div>`
    : `<div class="compact-state">${result.status==='unknown'?'Δεν έχει καταγραφεί':result.status==='incompatible'?'Μη συγκρίσιμες τιμές':result.status==='not_configured'?'Χωρίς standard':metric.type==='boolean'?(result.status==='met'?'✓ Σύμφωνο με τον στόχο':'Διαφορετική κατάσταση'):(active?'Σύγκριση χωρίς ποσοστό':'—')}</div>`;
  return `<article class="metric-card compact-card ${condensed?'condensed':''}">
    <div class="compact-top">
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
      <div class="area-heading"><span class="area-symbol" style="--area-color:${escapeAttrColor(area.color)}">▦</span><div><h3>${esc(area.name)}</h3><p>${metrics.length} ${metrics.length===1?'δείκτης':'δείκτες'}</p></div></div>
      <div class="area-controls">
        <button class="icon-btn" data-action="move-area" data-id="${esc(area.id)}" data-dir="-1" ${index===0?'disabled':''} title="Μετακίνηση πάνω" aria-label="Μετακίνηση πάνω">↑</button>
        <button class="icon-btn" data-action="move-area" data-id="${esc(area.id)}" data-dir="1" ${index===workspace.areas.length-1?'disabled':''} title="Μετακίνηση κάτω" aria-label="Μετακίνηση κάτω">↓</button>
        <button class="icon-btn" data-action="edit-area" data-id="${esc(area.id)}" title="Μετονομασία" aria-label="Μετονομασία φακέλου">✎</button>
      </div>
    </div>
    <div class="area-metrics">${metrics.length?metrics.map(m=>renderMetric(m)).join(''):'<div class="area-empty">Δεν έχεις προσθέσει ακόμη κάποιον στόχο ή standard.</div>'}</div>
    <div class="area-footer"><button class="area-add" data-action="add-metric" data-area="${esc(area.id)}"><span>＋</span> Νέος στόχος / standard</button></div>
  </section>`;
}
function render(){
  const counts=getCounts();
  const areas=orderedAreas(workspace);
  const selectedArea=areaById(view);
  const gold=workspace.metrics.filter(m=>m.gold).sort((a,b)=>areas.findIndex(x=>x.id===a.areaId)-areas.findIndex(x=>x.id===b.areaId));
  const showGold=view==='all' && gold.length;
  const visibleAreas=selectedArea?[selectedArea]:view==='gold'?[]:areas;
  const title=selectedArea?selectedArea.name:view==='gold'?'Χρυσοί στόχοι':'Η συνολική μου εικόνα';
  root.innerHTML=`<div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-icon">✦</div><div><b>it works<span>.</span></b><small>LIFE TRACKER</small></div></div>
      <div class="nav-section-label">Ο ΧΩΡΟΣ ΜΟΥ</div>
      <nav aria-label="Τομείς ζωής"><button class="nav-item ${view==='all'?'active':''}" data-action="navigate" data-view="all"><span>◫</span> Συνολική εικόνα</button><button class="nav-item ${view==='gold'?'active':''}" data-action="navigate" data-view="gold"><span class="gold-icon">★</span> Χρυσοί στόχοι</button></nav>
      <div class="nav-divider"></div><div class="side-heading"><span>ΟΙ ΤΟΜΕΙΣ ΜΟΥ</span><button data-action="add-area" class="side-add" title="Νέος φάκελος" aria-label="Νέος φάκελος">＋</button></div>
      <nav aria-label="Προσωπικοί φάκελοι">${areas.map(a=>`<button class="nav-item ${view===a.id?'active':''}" data-action="navigate" data-view="${esc(a.id)}"><span class="area-dot" style="background:${escapeAttrColor(a.color)}"></span><span class="nav-name">${esc(a.name)}</span></button>`).join('')}${areas.length?'':'<div class="sidebar-empty">Ξεκίνα προσθέτοντας έναν τομέα.</div>'}</nav>
      <div class="sidebar-bottom"><span class="local-dot"></span><div><b>Local Preview</b><small>Χωρίς λογαριασμό ή cloud sync</small></div></div>
    </aside>
    <main class="main-content">
      <header class="topbar"><div class="topbar-brand">IT WORKS <span>/ LIFE TRACKER</span></div><div class="topbar-actions"><span class="preview-tag">ΠΡΩΤΟΤΥΠΟ</span><button class="top-icon" data-action="export" title="Εξαγωγή δεδομένων">⇩ <span>Backup</span></button></div></header>
      <div class="content-wrap">
        <div class="page-heading"><div class="eyebrow">PERSONAL LIFE DASHBOARD</div><h1>${esc(title)}</h1><p>${selectedArea?'Οι δείκτες που έχεις επιλέξει για αυτόν τον τομέα.':view==='gold'?'Όσα έχεις ορίσει ως σημαντικότερες προσωπικές προτεραιότητες.':'Μια καθαρή εικόνα της σημερινής σου κατάστασης σε σχέση με τη ζωή που εσύ ορίζεις.'}</p></div>
        ${view==='all'?`${workspace.purpose.visible && workspace.purpose.text?`<section class="purpose-card"><div><div class="purpose-eyebrow">✦ Ο ΣΚΟΠΟΣ ΜΟΥ</div><p>${esc(workspace.purpose.text)}</p></div><button class="purpose-edit" data-action="purpose" aria-label="Επεξεργασία σκοπού">✎</button></section>`:`<button class="purpose-placeholder" data-action="purpose">✦ ${workspace.purpose.text?'Εμφάνισε ξανά τον σκοπό μου':'Πρόσθεσε τον προσωπικό σου σκοπό'} <span>＋</span></button>`}
        `:''}
        ${showGold?`<section class="gold-section"><div class="section-heading"><div><span class="eyebrow gold-eyebrow">★ ΠΡΟΣΩΠΙΚΕΣ ΠΡΟΤΕΡΑΙΟΤΗΤΕΣ</span><h2>Οι χρυσοί στόχοι μου</h2></div><button class="text-btn" data-action="navigate" data-view="gold">Προβολή όλων →</button></div><div class="gold-grid">${gold.slice(0,3).map(m=>renderMetric(m,true)).join('')}</div></section>`:''}
        ${view==='gold'?`<div class="section-heading"><h2>Σημαντικές επιλογές</h2></div>${gold.length?`<div class="gold-grid">${gold.map(m=>renderMetric(m,true)).join('')}</div>`:'<section class="empty-panel"><span class="empty-art">☆</span><h2>Δεν έχεις επιλέξει χρυσούς στόχους</h2><p>Πάτησε το αστέρι σε έναν δείκτη για να εμφανίζεται εδώ.</p><button class="primary-btn" data-action="navigate" data-view="all">Πίσω στους τομείς</button></section>'}`:''}
        ${view!=='gold'?`<section class="areas-section"><div class="section-heading"><div><span class="eyebrow">${selectedArea?'ΟΙ ΣΤΟΧΟΙ ΜΟΥ':'ΠΡΟΣΩΠΙΚΕΣ ΠΕΡΙΟΧΕΣ'}</span><h2>${selectedArea?'Standards & στόχοι':'Οι τομείς της ζωής μου'}</h2></div><button class="outline-btn" data-action="add-area"><span>＋</span> Νέος τομέας</button></div>
        ${visibleAreas.length?`<div class="areas-stack">${visibleAreas.map(renderArea).join('')}</div>`:`<section class="empty-panel"><span class="empty-art">▦</span><h2>Η ζωή σου, οι δικοί σου τομείς</h2><p>Δημιούργησε τους φακέλους που θέλεις. Μέσα σε κάθε έναν θα βάζεις το δικό σου standard και πού βρίσκεσαι σήμερα.</p><div class="empty-actions"><button class="primary-btn" data-action="add-area">＋ Δημιουργία πρώτου τομέα</button><button class="outline-btn" data-action="load-demo">Δες ένα παράδειγμα</button></div></section>`}</section>`:''}
        ${view==='all'?`<section class="stats-grid" aria-label="Συνοπτικά στοιχεία"><div class="stat"><span>Τομείς ζωής</span><strong>${counts.areas}</strong><small>Προσωπικοί φάκελοι</small></div><div class="stat"><span>Δείκτες</span><strong>${counts.metrics}</strong><small>Standards & στόχοι</small></div><div class="stat"><span>Επιτευγμένα</span><strong>${counts.met}</strong><small>Από όσα καταγράφηκαν</small></div><div class="stat"><span>Χωρίς καταγραφή</span><strong>${counts.unknown}</strong><small>Ακόμη άγνωστα</small></div></section>`:''}
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
function repositionArea(id,dir){const sorted=orderedAreas(workspace),i=sorted.findIndex(a=>a.id===id),other=sorted[i+dir];if(i<0||!other)return; const x=sorted[i]; const original=x.order;x.order=other.order;other.order=original; if(x.order===other.order){sorted.forEach((a,j)=>a.order=j);const tmp=sorted[i];sorted[i]=sorted[i+dir];sorted[i+dir]=tmp;sorted.forEach((a,j)=>a.order=j);}commit('Η σειρά των τομέων ενημερώθηκε');}

document.addEventListener('click',event=>{
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
    if(action==='close'){document.getElementById('active-dialog')?.close();return;}
    if(action==='navigate'){view=b.dataset.view;render();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(action==='add-area')return showAreaForm();
    if(action==='delete-area'){const a=areaById(id);if(!a||!confirm(`Να διαγραφεί ο φάκελος «${a.name}» και όλοι οι δείκτες του; Δεν μπορεί να αναιρεθεί.`))return;workspace.areas=workspace.areas.filter(x=>x.id!==id);workspace.metrics=workspace.metrics.filter(x=>x.areaId!==id);if(view===id)view='all';document.getElementById('active-dialog')?.close();return commit('Ο φάκελος διαγράφηκε.');}
    if(action==='delete-metric'){const m=metricById(id);if(!m||!confirm(`Να διαγραφεί ο δείκτης «${m.title}» και το ιστορικό του; Δεν μπορεί να αναιρεθεί.`))return;workspace.metrics=workspace.metrics.filter(x=>x.id!==id);document.getElementById('active-dialog')?.close();return commit('Ο δείκτης διαγράφηκε.');}
    if(action==='edit-area')return showAreaForm(areaById(id));
    if(action==='move-area')return repositionArea(id,Number(b.dataset.dir));
    if(action==='add-metric')return showMetricForm(b.dataset.area);
    if(action==='edit-metric')return showMetricForm(metricById(id)?.areaId,metricById(id));
    if(action==='update')return showActualForm(metricById(id));
    if(action==='history')return showHistory(metricById(id));
    if(action==='purpose')return showPurposeForm();
    if(action==='gold'){const m=metricById(id);if(m){m.gold=!m.gold;commit(m.gold?'Προστέθηκε στους χρυσούς στόχους':'Αφαιρέθηκε από χρυσούς στόχους');}return;}
    if(action==='export'){exportWorkspace(workspace);return toast('Το JSON αντίγραφο δημιουργήθηκε.');}
    if(action==='load-demo'){if(workspace.areas.length&&!confirm('Να αντικατασταθούν οι τωρινοί τοπικοί δείκτες με ενδεικτικά δεδομένα;'))return;workspace=demoWorkspace();view='all';return commit('Φορτώθηκαν φανταστικά δεδομένα παραδείγματος.');}
    if(action==='reset'){if(!confirm('Να διαγραφούν ΟΛΑ τα δεδομένα αυτού του browser; Κάνε πρώτα εξαγωγή αν τα χρειάζεσαι.'))return;workspace={version:1,areas:[],metrics:[],purpose:{text:'',visible:true}};view='all';return commit('Καθαρίστηκαν τα τοπικά δεδομένα.');}
  }catch(e){toast(e.message||'Προέκυψε σφάλμα.',true);}
});
document.addEventListener('change',e=>{
  if(e.target.id==='metric-type'){
    const type=e.target.value;
    const holder=document.getElementById('measurement-fields');
    if(holder)holder.innerHTML=measurementFields(type);
  }
});
document.addEventListener('submit',e=>{
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
    else return;
    document.getElementById('active-dialog')?.close();commit();
  }catch(error){toast(error.message||'Έλεγξε τις τιμές που συμπλήρωσες.',true);}
});
render();
if('serviceWorker' in navigator && location.protocol !== 'file:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
