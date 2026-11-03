/** Dashboard proposals and optional identity copy. No personal life content belongs here. */
export const DIRECTIONS = ["sanctuary", "health", "editorial"];
export const SCHEMES = ["dark", "light"];
export const IDENTITY_KEYS = ["ideal", "work", "mission", "personal"];
export const DIRECTION_LABELS = {sanctuary:"Σημείωμα",health:"Υγεία",editorial:"Περιοδικό"};

const EYEBROWS = {
  ideal: "ΤΟ ΠΡΟΣΩΠΙΚΟ ΙΔΕΩΔΕΣ",
  work: "ΤΟ ΕΡΓΟ ΤΗΣ ΖΩΗΣ",
  mission: "Η ΜΕΓΑΛΗ ΑΠΟΣΤΟΛΗ",
  personal: "Η ΠΡΟΣΩΠΙΚΗ ΖΩΗ",
};

const clip = (value, max) => String(value ?? "").trim().slice(0, max);

function blankSection(key, index) {
  return {id:`identity-${key}`, key, eyebrow:EYEBROWS[key], title:"", body:"", chips:[], order:index, visible:true};
}

export function normalizeAppearance(state) {
  const appearance = state.appearance && typeof state.appearance === "object" ? state.appearance : {};
  state.appearance = {
    direction: DIRECTIONS.includes(appearance.direction) ? appearance.direction : "sanctuary",
    scheme: SCHEMES.includes(appearance.scheme) ? appearance.scheme : "dark",
    showAffirmations: appearance.showAffirmations !== false,
    showIdentity: appearance.showIdentity !== false,
  };
  const seen = new Set();
  const affirmations = [];
  for (const item of Array.isArray(state.affirmations) ? state.affirmations : []) {
    if (!item || typeof item !== "object") continue;
    const id = clip(item.id, 100);
    const text = clip(item.text, 180);
    if (!id || !text || seen.has(id)) continue;
    seen.add(id);
    affirmations.push({id, text, order:affirmations.length});
    if (affirmations.length === 12) break;
  }
  state.affirmations = affirmations;
  const incoming = state.identity && typeof state.identity === "object" ? state.identity : {};
  const byKey = new Map();
  for (const section of Array.isArray(incoming.sections) ? incoming.sections : []) {
    if (section && IDENTITY_KEYS.includes(section.key) && !byKey.has(section.key)) byKey.set(section.key, section);
  }
  state.identity = {
    visible: incoming.visible !== false,
    sections: IDENTITY_KEYS.map((key, index) => {
      const source = byKey.get(key) || {};
      const chips = [];
      const chipIds = new Set();
      for (const chip of Array.isArray(source.chips) ? source.chips : []) {
        if (!chip || typeof chip !== "object") continue;
        const id = clip(chip.id, 100);
        const label = clip(chip.label, 24);
        if (!id || !label || chipIds.has(id)) continue;
        chipIds.add(id);
        chips.push({id, label});
        if (chips.length === 6) break;
      }
      return {
        id: clip(source.id, 100) || `identity-${key}`,
        key,
        eyebrow: clip(source.eyebrow, 80) || EYEBROWS[key],
        title: clip(source.title, 120),
        body: clip(source.body, 400),
        chips,
        order: index,
        visible: source.visible !== false,
      };
    }),
  };
  return state;
}

export function orderedAffirmations(state) {
  return [...(state.affirmations || [])].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function moveAffirmation(state, id, direction) {
  if (![-1, 1].includes(direction)) return false;
  const list = orderedAffirmations(state);
  const from = list.findIndex((item) => item.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= list.length) return false;
  [list[from], list[to]] = [list[to], list[from]];
  list.forEach((item, index) => { item.order = index; });
  state.affirmations = list;
  return true;
}

/** Fictional sample, shaped like a personal note and not taken from anyone's life. */
export function demoNarrative() {
  return {
    affirmations: [
      {id:"demo-aff-1", text:"Κρατώ τον λόγο που δίνω στον εαυτό μου.", order:0},
      {id:"demo-aff-2", text:"Μαθαίνω κάτι χρήσιμο κάθε εβδομάδα.", order:1},
      {id:"demo-aff-3", text:"Φροντίζω τους ανθρώπους που αγαπώ.", order:2},
      {id:"demo-aff-4", text:"Χτίζω έργο που αντέχει στον χρόνο.", order:3},
    ],
    identity: {
      visible: true,
      sections: [
        {id:"demo-ideal", key:"ideal", eyebrow:EYEBROWS.ideal, title:"Ήρεμος δημιουργός", body:"Κάποιος που διαλέγει με προσοχή και μένει σταθερός.", chips:[], order:0, visible:true},
        {id:"demo-work", key:"work", eyebrow:EYEBROWS.work, title:"Ένα μικρό εργαστήριο", body:"Δουλειά που φαίνεται και χρησιμεύει.", chips:[
          {id:"demo-chip-1", label:"Γράψιμο"},
          {id:"demo-chip-2", label:"Σχέδιο"},
          {id:"demo-chip-3", label:"Διδασκαλία"},
        ], order:1, visible:true},
        {id:"demo-mission", key:"mission", eyebrow:EYEBROWS.mission, title:"Να αφήνω τα πράγματα πιο καθαρά", body:"Λιγότερος θόρυβος, περισσότερη προσοχή.", chips:[], order:2, visible:true},
        {id:"demo-personal", key:"personal", eyebrow:EYEBROWS.personal, title:"Υγεία · Φιλία · Ησυχία", body:"Ώρες που δεν βιάζονται.", chips:[], order:3, visible:true},
      ],
    },
  };
}
