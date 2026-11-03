/** Pure product logic, independent of DOM, browser storage or any web framework. */
export const VALUE_TYPES = ["number", "money", "percentage", "boolean", "frequency"];
export const COMPARATORS = ["at_least", "at_most", "exact"];
export const AREA_PALETTE = ["#7067cf", "#168e83", "#c37646", "#4474ba", "#ad5686", "#718e49"];

export function emptyWorkspace() {
  return { version: 1, areas: [], metrics: [], purpose: { text: "", visible: true } };
}
export function makeId() { return crypto.randomUUID(); }
export function cleanText(value, max = 140) { return String(value ?? "").trim().slice(0, max); }
export function parseDecimal(raw) {
  const s = String(raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!s || !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)) throw new Error("Συμπλήρωσε έγκυρο αριθμό.");
  const n = Number(s);
  if (!Number.isFinite(n) || Math.abs(n) > 1e12) throw new Error("Ο αριθμός είναι εκτός ορίων.");
  return n;
}
export function parseValue(type, input, {currency = "EUR", period = "week"} = {}) {
  if (!VALUE_TYPES.includes(type)) throw new Error("Άγνωστος τύπος δείκτη.");
  if (type === "boolean") {
    if (input !== "yes" && input !== "no" && input !== true && input !== false) throw new Error("Επίλεξε Ναι ή Όχι.");
    return { type, value: input === "yes" || input === true };
  }
  const amount = parseDecimal(input);
  if (type === "percentage" && (amount < 0 || amount > 100)) throw new Error("Το ποσοστό πρέπει να είναι από 0 έως 100.");
  if (type === "frequency" && (amount < 0 || !["day", "week", "month", "year"].includes(period))) throw new Error("Μη έγκυρη συχνότητα.");
  if (type === "money") {
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Το νόμισμα πρέπει να έχει 3 γράμματα.");
    if (!["once", "day", "week", "month", "year"].includes(period)) throw new Error("Μη έγκυρη οικονομική περίοδος.");
    return { type, amount, currency, period };
  }
  if (type === "frequency") return { type, amount, period, mode: "reported_rate" };
  return { type, amount };
}
export function sameValue(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
export function isCompatible(a, b) {
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === "money") return a.currency === b.currency && a.period === b.period;
  if (a.type === "frequency") return a.period === b.period && a.mode === b.mode;
  return true;
}
export function getCurrent(metric, at = Date.now()) {
  return (metric.observations ?? []).map((o, index) => ({...o, _index: index}))
    .filter(o => !o.superseded && Number.isFinite(Date.parse(o.observedAt)) && Date.parse(o.observedAt) <= at)
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || Date.parse(b.createdAt) - Date.parse(a.createdAt) || b._index - a._index)[0] ?? null;
}
export function getTarget(metric, at = Date.now()) {
  return (metric.targets ?? []).map((t, index) => ({...t, _index: index}))
    .filter(t => Number.isFinite(Date.parse(t.effectiveAt)) && Date.parse(t.effectiveAt) <= at)
    .sort((a, b) => Date.parse(b.effectiveAt) - Date.parse(a.effectiveAt) || Date.parse(b.createdAt) - Date.parse(a.createdAt) || b._index - a._index)[0] ?? null;
}
export function compareMetric(metric, at = Date.now()) {
  const actual = getCurrent(metric, at);
  const target = getTarget(metric, at);
  if (!target) return { status: "not_configured", actual, target, gap: null };
  if (!actual) return { status: "unknown", actual, target, gap: null };
  if (!isCompatible(actual.value, target.value)) return { status: "incompatible", actual, target, gap: null };
  const a = actual.value, t = target.value;
  if (metric.type === "boolean") return { status: a.value === t.value ? "met" : "unmet", actual, target, gap: null };
  const operator = metric.comparator || "at_least";
  const met = operator === "at_most" ? a.amount <= t.amount : operator === "exact" ? a.amount === t.amount : a.amount >= t.amount;
  const gap = Number((t.amount - a.amount).toFixed(6));
  return { status: met ? "met" : "unmet", actual, target, gap };
}
/** Ratio only for compatible, nonnegative, positive-target "at least" metrics.
 * This is per-metric progress, never a universal score of someone's life.
 * No invented percent for booleans, lower-is-better, zero targets or missing data.
 */
export function metricProgress(metric, comparison = compareMetric(metric)) {
  if (metric.type === "boolean" || (metric.comparator || "at_least") !== "at_least") return null;
  if (!["met", "unmet"].includes(comparison.status)) return null;
  const actual = comparison.actual?.value?.amount;
  const target = comparison.target?.value?.amount;
  if (!Number.isFinite(actual) || !Number.isFinite(target) || actual < 0 || target <= 0) return null;
  const ratio = (actual / target) * 100;
  if (!Number.isFinite(ratio)) return null;
  return {percentage: Math.round(ratio * 10) / 10, filled: Math.min(100, Math.max(0, ratio))};
}
const PERIOD_LABELS = { once: "", day: "/ημέρα", week: "/εβδ.", month: "/μήνα", year: "/έτος" };
export function formatValue(value) {
  if (!value) return "Δεν έχει καταγραφεί";
  if (value.type === "boolean") return value.value ? "Ναι" : "Όχι";
  const n = new Intl.NumberFormat("el-GR", {maximumFractionDigits: 2}).format(value.amount);
  if (value.type === "money") return `${n} ${value.currency === "EUR" ? "€" : value.currency}${PERIOD_LABELS[value.period] || ""}`;
  if (value.type === "percentage") return `${n}%`;
  if (value.type === "frequency") return `${n}${PERIOD_LABELS[value.period] || ""}`;
  return n;
}
export function describeGap(metric, result) {
  if (result.status === "unknown") return "Δεν υπάρχουν ακόμη στοιχεία";
  if (result.status === "not_configured") return "Χωρίς επιθυμητή τιμή";
  if (result.status === "incompatible") return "Μη συγκρίσιμες τιμές";
  if (metric.type === "boolean") return result.status === "met" ? "Σύμφωνο με τον στόχο" : "Διαφορετική κατάσταση";
  if (result.status === "met") return "Το προσωπικό σου standard καλύπτεται";
  const gap = result.gap;
  const value = result.target.value;
  const n = new Intl.NumberFormat("el-GR", {maximumFractionDigits: 2}).format(Math.abs(gap));
  const suffix = value.type === "money" ? ` ${value.currency === "EUR" ? "€" : value.currency}${PERIOD_LABELS[value.period] || ""}` : value.type === "percentage" ? "%" : value.type === "frequency" ? PERIOD_LABELS[value.period] || "" : metric.unit ? ` ${metric.unit}` : "";
  if (metric.comparator === "at_most") return `Πάνω από το όριο κατά ${n}${suffix}`;
  if (metric.comparator === "exact") return `Απόκλιση ${n}${suffix}`;
  return `Απομένουν ${n}${suffix}`;
}
export function createArea(name, index = 0) {
  const title = cleanText(name, 80);
  if (!title) throw new Error("Δώσε όνομα στον φάκελο.");
  return { id: makeId(), name: title, order: index, color: AREA_PALETTE[index % AREA_PALETTE.length], createdAt: new Date().toISOString() };
}
export function createMetric({ areaId, title, kind, type, comparator = "at_least", unit = "", desired, initial = null, currency = "EUR", period = "week" }) {
  const cleanTitle = cleanText(title, 120);
  if (!areaId || !cleanTitle) throw new Error("Συμπλήρωσε όνομα δείκτη και φάκελο.");
  if (!["standard", "goal"].includes(kind) || !VALUE_TYPES.includes(type)) throw new Error("Μη έγκυρος τύπος στόχου.");
  if (!COMPARATORS.includes(comparator)) throw new Error("Μη έγκυρος κανόνας σύγκρισης.");
  const stamp = new Date().toISOString();
  const target = parseValue(type, desired, {currency, period});
  const m = { id: makeId(), areaId, title: cleanTitle, kind, type, comparator, unit: cleanText(unit, 30), gold: false, createdAt: stamp, targets: [{id: makeId(), value: target, effectiveAt: stamp, createdAt: stamp}], observations: [] };
  if (initial !== null && String(initial).trim() !== "") m.observations.push({id: makeId(), value: parseValue(type, initial, {currency, period}), observedAt: stamp, createdAt: stamp});
  return m;
}
export function addObservation(metric, input, at = new Date().toISOString()) {
  const target = getTarget(metric);
  const options = target?.value || {};
  const value = parseValue(metric.type, input, options);
  if (!Number.isFinite(Date.parse(at)) || Date.parse(at) > Date.now() + 60_000) throw new Error("Μη έγκυρη ημερομηνία καταγραφής.");
  return {...metric, observations: [...metric.observations, { id: makeId(), value, observedAt: at, createdAt: new Date().toISOString() }]};
}
export function changeTarget(metric, input, {comparator, title, kind, unit} = {}) {
  const original = getTarget(metric)?.value || {};
  const value = parseValue(metric.type, input, original);
  const now = new Date().toISOString();
  const next = {...metric, title: title == null ? metric.title : cleanText(title, 120), kind: kind || metric.kind, comparator: comparator || metric.comparator, unit: unit == null ? metric.unit : cleanText(unit, 30)};
  if (!next.title) throw new Error("Ο δείκτης χρειάζεται όνομα.");
  if (!sameValue(value, original)) next.targets = [...metric.targets, {id: makeId(), value, effectiveAt: now, createdAt: now}];
  return next;
}
export function orderedAreas(state) { return [...state.areas].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)); }
/** Independent, persistent manual ordering in folders and in the gold collection.
 * Older localStorage workspaces have no order fields, so keep their original order
 * on first normalization rather than changing the user's existing layout.
 */
export function normalizeMetricOrders(state) {
  for (const area of orderedAreas(state)) {
    const metrics = state.metrics.filter(m => m.areaId === area.id);
    const legacy = metrics.every(m => !Number.isFinite(m.order));
    const sorted = legacy
      ? metrics.sort((a,b) => Number(b.gold)-Number(a.gold) || a.createdAt.localeCompare(b.createdAt))
      : metrics.sort((a,b) => (Number.isFinite(a.order)?a.order:Infinity) - (Number.isFinite(b.order)?b.order:Infinity) || a.createdAt.localeCompare(b.createdAt));
    sorted.forEach((m,i) => { m.order=i; });
  }
  const gold = state.metrics.filter(m => m.gold);
  const legacyGold = gold.every(m => !Number.isFinite(m.goldOrder));
  const areaRank = new Map(orderedAreas(state).map((a,i) => [a.id,i]));
  const sortedGold = legacyGold
    ? gold.sort((a,b) => (areaRank.get(a.areaId)??Infinity)-(areaRank.get(b.areaId)??Infinity) || a.createdAt.localeCompare(b.createdAt))
    : gold.sort((a,b) => (Number.isFinite(a.goldOrder)?a.goldOrder:Infinity)-(Number.isFinite(b.goldOrder)?b.goldOrder:Infinity) || a.createdAt.localeCompare(b.createdAt));
  sortedGold.forEach((m,i) => { m.goldOrder=i; });
  return state;
}
export function metricsInArea(state, areaId) {
  return state.metrics.filter(m => m.areaId === areaId)
    .sort((a,b) => (Number.isFinite(a.order)?a.order:Infinity)-(Number.isFinite(b.order)?b.order:Infinity) || a.createdAt.localeCompare(b.createdAt));
}
export function orderedGoldMetrics(state) {
  return state.metrics.filter(m => m.gold)
    .sort((a,b) => (Number.isFinite(a.goldOrder)?a.goldOrder:Infinity)-(Number.isFinite(b.goldOrder)?b.goldOrder:Infinity) || a.createdAt.localeCompare(b.createdAt));
}
/** Reorder by adjacent swap, with unchanged metric identifiers and histories. */
export function moveMetric(state, metricId, direction, collection='area') {
  if (![-1,1].includes(direction) || !['area','gold'].includes(collection)) return false;
  normalizeMetricOrders(state);
  const metric = state.metrics.find(m => m.id === metricId);
  if (!metric || (collection==='gold' && !metric.gold)) return false;
  const ordered = collection==='gold' ? orderedGoldMetrics(state) : metricsInArea(state,metric.areaId);
  const from=ordered.findIndex(m => m.id === metricId), to=from+direction;
  if (from<0 || to<0 || to>=ordered.length) return false;
  [ordered[from],ordered[to]]=[ordered[to],ordered[from]];
  ordered.forEach((m,i) => { if(collection==='gold') m.goldOrder=i; else m.order=i; });
  return true;
}
export function isWorkspaceShape(value) {
  return value !== null && typeof value === "object" && value.version === 1 && Array.isArray(value.areas) && Array.isArray(value.metrics) && value.purpose && typeof value.purpose.text === "string" && typeof value.purpose.visible === "boolean";
}
export function demoWorkspace() {
  const s = emptyWorkspace();
  const names = ["Σχέσεις & φίλοι", "Οικονομικά", "Πνευματικότητα"];
  s.areas = names.map((name, i) => createArea(name, i));
  const examples = [
    {areaId:s.areas[0].id,title:"Κοντινοί φίλοι που βλέπω συχνά",kind:"standard",type:"number",desired:"4",initial:"1"},
    {areaId:s.areas[0].id,title:"Συντροφική σχέση",kind:"goal",type:"boolean",desired:"yes",initial:"no"},
    {areaId:s.areas[1].id,title:"Μηνιαίο εισόδημα",kind:"goal",type:"money",currency:"EUR",period:"month",desired:"2000",initial:"750"},
    {areaId:s.areas[1].id,title:"Αποταμίευση επί εισοδήματος",kind:"standard",type:"percentage",desired:"20",initial:"10"},
    {areaId:s.areas[2].id,title:"Νηστεία (αυτοαναφερόμενη συχνότητα)",kind:"standard",type:"frequency",period:"week",desired:"2",initial:"1"}
  ];
  s.metrics = examples.map(createMetric);
  s.metrics[0].gold = true;
  s.metrics[2].gold = true;
  s.purpose = {text:"Να δημιουργώ συνειδητά μια ζωή που αντανακλά τις δικές μου αξίες.",visible:true};
  return s;
}
