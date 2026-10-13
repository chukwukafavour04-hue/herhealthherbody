(() => {
  'use strict';
  const STORE = 'earlySignsLog';

  // area = body system the symptom relates to; red = persistent for 2+ weeks is worth a visit
  const SYMPTOMS = [
    { id: 'lump',      label: 'Breast or underarm lump',        area: 'Breast',     urgent: true },
    { id: 'nipple',    label: 'Nipple discharge or change',     area: 'Breast',     urgent: true },
    { id: 'skinbreast',label: 'Breast dimpling or redness',     area: 'Breast' },
    { id: 'bleed',     label: 'Bleeding after menopause / between periods', area: 'Gynaecologic', urgent: true },
    { id: 'discharge', label: 'Unusual vaginal discharge',      area: 'Gynaecologic' },
    { id: 'pelvic',    label: 'Pelvic pain or pressure',        area: 'Gynaecologic' },
    { id: 'bloat',     label: 'Persistent bloating / feeling full', area: 'Gynaecologic' },
    { id: 'urinary',   label: 'Urgent or frequent urination',   area: 'Gynaecologic' },
    { id: 'stool',     label: 'Blood in stool / bowel habit change', area: 'Digestive', urgent: true },
    { id: 'abdpain',   label: 'Ongoing abdominal pain',         area: 'Digestive' },
    { id: 'cough',     label: 'Cough that will not go away',    area: 'Lung' },
    { id: 'breath',    label: 'Shortness of breath',            area: 'Lung' },
    { id: 'mole',      label: 'Changing mole or non-healing sore', area: 'Skin', urgent: true },
    { id: 'weight',    label: 'Unexplained weight loss',        area: 'General', urgent: true },
    { id: 'fatigue',   label: 'Extreme tiredness',              area: 'General' },
    { id: 'sweats',    label: 'Night sweats or fevers',         area: 'General' }
  ];

  const $ = id => document.getElementById(id);
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
  const save = d => { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch {} };
  const byId = Object.fromEntries(SYMPTOMS.map(s => [s.id, s]));

  function el(tag, text, cls) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function renderChips() {
    const box = $('symptomList');
    SYMPTOMS.forEach(s => {
      const l = el('label'); l.dataset.area = s.area;
      const i = el('input'); i.type = 'checkbox'; i.value = s.id;
      l.append(i, el('span', s.label));
      box.append(l);
    });
  }

  // Count each symptom across entries; persistent (2+ weeks) or repeated symptoms get flagged.
  function analyse(entries) {
    const stats = {};
    entries.forEach(e => e.symptoms.forEach(id => {
      const s = stats[id] || (stats[id] = { count: 0, persistent: false });
      s.count++;
      if (e.duration === '2') s.persistent = true;
    }));
    const alerts = [], watch = [];
    Object.entries(stats).forEach(([id, s]) => {
      const info = byId[id]; if (!info) return;
      const msg = `${info.label} (${info.area}) – logged ${s.count} time${s.count > 1 ? 's' : ''}`;
      if (info.urgent && (s.persistent || s.count >= 2)) alerts.push(msg);
      else if (s.persistent || s.count >= 3) watch.push(msg);
    });
    return { alerts, watch };
  }

  function renderFlags() {
    const box = $('flags'); box.replaceChildren();
    const entries = load();
    if (!entries.length) { box.append(el('div', 'Save your first entry to see patterns here.', 'flag ok')); return; }
    const { alerts, watch } = analyse(entries);
    alerts.forEach(m => box.append(el('div', 'Book a doctor visit soon: ' + m, 'flag alert')));
    watch.forEach(m => box.append(el('div', 'Keep watching and mention to your doctor: ' + m, 'flag watch')));
    if (!alerts.length && !watch.length) box.append(el('div', 'No repeating or lasting symptoms so far. Keep logging anything new.', 'flag ok'));
  }

  function renderHistory() {
    const ul = $('history'); ul.replaceChildren();
    const entries = load().slice().reverse();
    if (!entries.length) { ul.append(el('li', 'No entries yet.')); return; }
    entries.forEach(e => {
      const li = el('li');
      li.append(el('strong', e.date), el('div', e.symptoms.map(id => byId[id]?.label).filter(Boolean).join(', ') || 'No symptoms'));
      li.append(el('small', (e.duration === '2' ? '2+ weeks' : 'Under 2 weeks') + (e.notes ? ' · ' + e.notes : '')));
      ul.append(li);
    });
  }

  function screening(age, smoker, family) {
    const out = [];
    out.push('Skin: check moles monthly; see a doctor about any change.');
    if (age >= 21 && age <= 29) out.push('Cervical: Pap test every 3 years.');
    if (age >= 30 && age <= 65) out.push('Cervical: HPV test every 5 years, or Pap every 3 years (your doctor may combine them).');
    if (age >= 40 && age <= 74) out.push('Breast: mammogram about every 2 years (ask about yearly).');
    if (age >= 45 && age <= 75) out.push('Colorectal: start screening at 45 (stool test or colonoscopy; interval depends on method).');
    if (age >= 50 && age <= 80 && smoker) out.push('Lung: ask about yearly low-dose CT scans.');
    if (family) out.push('Family history: ask about genetic counselling (BRCA1/BRCA2) and whether to screen earlier.');
    if (age < 21) out.push('Routine cancer screening usually starts later; discuss HPV vaccination with your doctor.');
    out.push('These are general guidelines and vary by country. Confirm with your doctor.');
    return out;
  }

  function init() {
    $('date').valueAsDate = new Date();
    renderChips(); renderFlags(); renderHistory();

    $('logForm').addEventListener('submit', ev => {
      ev.preventDefault();
      const symptoms = [...document.querySelectorAll('#symptomList input:checked')].map(i => i.value);
      const data = load();
      data.push({ date: $('date').value, symptoms, duration: $('duration').value, notes: $('notes').value.trim() });
      save(data);
      ev.target.reset(); $('date').valueAsDate = new Date();
      renderFlags(); renderHistory();
    });

    $('screenForm').addEventListener('submit', ev => {
      ev.preventDefault();
      const ul = $('screenOut'); ul.replaceChildren();
      screening(+$('age').value, $('smoker').checked, $('family').checked).forEach(t => ul.append(el('li', t)));
    });

    $('exportBtn').addEventListener('click', () => {
      const lines = ['Early Signs symptom log', ''];
      load().forEach(e => lines.push(`${e.date} | ${e.symptoms.map(id => byId[id]?.label).join('; ') || 'none'} | ${e.duration === '2' ? '2+ weeks' : '<2 weeks'}${e.notes ? ' | ' + e.notes : ''}`));
      const a = el('a');
      a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
      a.download = 'symptom-log.txt'; a.click();
      URL.revokeObjectURL(a.href);
    });

    $('clearBtn').addEventListener('click', () => {
      if (confirm('Delete all saved entries? This cannot be undone.')) { save([]); renderFlags(); renderHistory(); }
    });
  }
  init();
})();
