/* Trip Helper — single-traveller client-side PWA. No backend: IndexedDB + share links. */
'use strict';

/* ---------- IndexedDB ---------- */
const DB = {
  _db: null,
  open() {
    return new Promise((res, rej) => {
      if (DB._db) return res(DB._db);
      const r = indexedDB.open('triphelper', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
      };
      r.onsuccess = () => { DB._db = r.result; res(DB._db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(store, mode, fn) {
    const d = await DB.open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const out = fn(t.objectStore(store));
      t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  },
  getKV: k => DB.tx('kv', 'readonly', s => s.get(k)).then(r => r),
  setKV: (k, v) => DB.tx('kv', 'readwrite', s => s.put(v, k)),
  addFile: f => DB.tx('files', 'readwrite', s => s.add(f)),
  putFile: f => DB.tx('files', 'readwrite', s => s.put(f)),
  delFile: id => DB.tx('files', 'readwrite', s => s.delete(id)),
  allFiles() {
    return DB.open().then(d => new Promise((res, rej) => {
      const out = [];
      const c = d.transaction('files').objectStore('files').openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else res(out); };
      c.onerror = () => rej(c.error);
    }));
  }
};

/* ---------- state ---------- */
let trip = null;
const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SEED = {
  name: '挪威之旅（示範：7月4–12）', country: 'Norway',
  contacts: [
    { name: '挪威緊急（警察/救護）', phone: '112', note: '112警察 113救護' },
    { name: 'Fjord Tours 客服', phone: '+47 55 55 76 60', note: '訂單問題' },
    { name: 'Visit Geiranger', phone: '+47 70 26 30 07', note: 'RIB／遊船' }
  ],
  days: [
    { date: '2026-07-04', label: 'Geiranger → Ålesund', legs: [
      { t: '09:00', what: '離屋、行李寄存碼頭售票處', loc: 'Homlungsvegen 34, 6216 Geiranger', q: 'Homlungsvegen 34, 6216 Geiranger, Norway', status: '', note: '按件收費' },
      { t: '09:50', what: 'RIB快艇集合（早10分鐘）', loc: 'Geiranger Brygge, Maråkvegen 35', q: 'Maråkvegen 35, 6216 Geiranger, Norway', status: 'booked', note: '895 NOK · 防水衣佢提供' },
      { t: '11:50', what: 'Panorama巴士團集合（早10分鐘）', loc: '遊客中心門前大馬路', q: '62.1008,7.2056', status: 'booked', note: '710 NOK · 集合點以確認email為準' },
      { t: '14:45', what: '攞行李 → 遊船集合（早15分鐘）', loc: 'Geiranger Fjordservice（碼頭）', q: '62.1008,7.2056', status: 'booked', note: '' },
      { t: '18:00', what: '落船 → 入住', loc: 'Øwregata 11, Ålesund', q: 'Øwregata 11, Ålesund, Norway', status: '', note: '€243.41 · 問房東攞匙' }
    ]},
    { date: '2026-07-05', label: 'Ålesund → Bergen（四程）', legs: [
      { t: '10:50', what: 'Vy 430 巴士（指定座位 車卡1 16A-D+18B）', loc: 'Skateflukaia（遊客中心旁）', q: 'Skateflukaia, 6002 Ålesund, Norway', status: 'booked', note: '' },
      { t: '14:25', what: '轉 Skyss 150（車頭Måløy）— 10分鐘‼', loc: 'Nordfjordeid 巴士站', q: 'Nordfjordeid busstasjon, 6770 Nordfjordeid, Norway', status: 'booked', note: '落車企定原站轉' },
      { t: '15:40', what: 'Norled 快船（船會等巴士）', loc: 'Måløy 碼頭（落車行2分鐘）', q: 'Måløy, Norway', status: 'booked', note: '' },
      { t: '20:15', what: '到 Bergen → 入住', loc: 'Strandkaiterminalen → Nedre Fjellsmauet 18', q: 'Nedre Fjellsmauet 18, 5018 Bergen, Norway', status: '', note: '€518.36' }
    ]},
    { date: '2026-07-06', label: 'Bergen → Odda', legs: [
      { t: '11:44', what: '巴士 930', loc: 'Bergen busstasjon', q: 'Bergen busstasjon, Norway', status: 'todo', note: '🚨車飛未買（Skyss app）' },
      { t: '15:30', what: '入住＋行山補給', loc: 'Sjukehusvegen 20, Odda', q: 'Sjukehusvegen 20, 5750 Odda, Norway', status: '', note: '🚨Excel入面Airbnb link錯（係Bergen間房）— App訂單核對' },
      { t: '21:00', what: 'Trolltunga 行山簡介會', loc: 'Trolltunga Hotel, Odda', q: 'Trolltunga Hotel, Odda, Norway', status: 'booked', note: '' }
    ]},
    { date: '2026-07-07', label: 'Trolltunga 行山', legs: [
      { t: '07:30', what: '導賞團出發（20km／10–12小時）', loc: '集合點以簡介會為準', q: 'Trolltunga, Norway', status: 'booked', note: '行山鞋＋2L水＋防水＋糧' }
    ]},
    { date: '2026-07-08', label: 'Odda → Bergen → ✈ Svolvær', legs: [
      { t: '05:30', what: '巴士 930（04:45起身）', loc: 'Odda busstasjon', q: 'Odda busstasjon, Norway', status: 'todo', note: '🚨車飛未買' },
      { t: '17:20', what: 'Widerøe WF616→WF836', loc: 'Bergen Airport Flesland', q: 'Bergen Airport Flesland, Norway', status: 'booked', note: '16:20前到；Bybanen輕鐵直達' },
      { t: '21:30', what: '入住（取匙：Lofoten Suitehotel）', loc: 'Austnesfjordgata 40, Svolvær', q: 'Austnesfjordgata 40, 8300 Svolvær, Norway', status: '', note: '€1011／三晚' }
    ]},
    { date: '2026-07-09', label: '羅弗敦本地團', legs: [
      { t: '08:15', what: '本地團（–17:30；接送點見訂單email）', loc: 'Svolvær', q: 'Svolvær, Norway', status: 'booked', note: '午夜太陽·眼罩' }
    ]},
    { date: '2026-07-10', label: 'Reine ＋ Reinebringen', legs: [
      { t: '09:12', what: '巴士 742/741', loc: 'Svolvær busstasjon', q: 'Svolvær busstasjon, Norway', status: 'todo', note: '🚨未買（Reis Nordland app）· 回程尾班20:23' },
      { t: '日間', what: 'Reinebringen 石級（約1500級）', loc: 'Reinebringen, Reine', q: 'Reinebringen, Norway', status: '', note: '落雨唔上' }
    ]},
    { date: '2026-07-11', label: '回程 → 香港', legs: [
      { t: '15:10', what: 'WF829→SK4117（Taxifix叫車去機場）', loc: 'Svolvær lufthavn Helle', q: 'Svolvær lufthavn Helle, Norway', status: 'booked', note: '' },
      { t: '20:50', what: '✈ Oslo → 赫爾辛基 →（00:35）→ 香港 17:40', loc: 'Oslo Airport Gardermoen', q: 'Oslo Airport Gardermoen, Norway', status: 'booked', note: '轉機1h45直行去閘·退稅單據' }
    ]}
  ],
  spots: [
    { when: '7/4 10:00', title: 'RIB防水衣團體照', note: '著好衫未上艇嗰陣影', q: 'RIB boat tour Geiranger' },
    { when: '7/4 ~13:00', title: 'Dalsnibba Skywalk（1500米）', note: '帶褸，凍10度', q: 'Dalsnibba Skywalk Geiranger' },
    { when: '7/4 15:00–15:45', title: '遊船右舷：七姊妹瀑布', note: '開船即霸右邊欄杆', q: 'Seven Sisters waterfall Geirangerfjord' },
    { when: '7/4 晚', title: 'Ålesund Aksla 418級觀景台', note: '21:00金光', q: 'Aksla viewpoint Ålesund' },
    { when: '7/7', title: 'Trolltunga 舌尖', note: '導遊安排排隊', q: 'Trolltunga' },
    { when: '7/10', title: 'Reinebringen 山頂全景', note: '羅弗敦明信片位', q: 'Reinebringen view' }
  ]
};

/* ---------- helpers ---------- */
const mapsSearch = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
const mapsDir = (a, b) => 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(a) + '&destination=' + encodeURIComponent(b) + '&travelmode=walking';
const imgSearch = q => 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q);
const isCoord = q => /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test((q || '').trim());
function locPrecise(q) { // guard against confidently-wrong POI-name queries
  if (!q) return false;
  if (isCoord(q)) return true;
  return q.split(',').length >= 2 && /(\d|busstasjon|airport|lufthavn|station|hotel)/i.test(q) && /,\s*[A-Za-zÆØÅæøå .]+$/.test(q);
}
async function save() { await DB.setKV('trip', JSON.parse(JSON.stringify(trip))); }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- generic form dialog ---------- */
function form(title, fields, values = {}) {
  return new Promise(res => {
    const dlg = $('#dlg');
    $('#dlgTitle').textContent = title;
    $('#dlgFields').innerHTML = fields.map(f =>
      `<label>${esc(f.label)}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}
       ${f.type === 'area'
         ? `<textarea name="${f.k}" rows="2">${esc(values[f.k] || '')}</textarea>`
         : f.type === 'select'
         ? `<select name="${f.k}">${f.opts.map(o => `<option value="${o[0]}"${values[f.k] === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>`
         : `<input name="${f.k}" value="${esc(values[f.k] || '')}" placeholder="${esc(f.ph || '')}">`}
      </label>`).join('');
    dlg.returnValue = '';
    dlg.showModal();
    dlg.onclose = () => {
      if (dlg.returnValue !== 'ok') return res(null);
      const out = {};
      fields.forEach(f => { out[f.k] = $('#dlgFields [name="' + f.k + '"]').value.trim(); });
      res(out);
    };
  });
}
const LEG_FIELDS = [
  { k: 't', label: '時間', ph: '09:50' },
  { k: 'what', label: '事項', ph: 'RIB快艇集合（早10分鐘）' },
  { k: 'loc', label: '地點顯示名', ph: 'Geiranger Brygge' },
  { k: 'q', label: '精確地址／座標', hint: '完整地址＋郵編＋國家，或「緯度,經度」— 唔好淨用地點名，Google會亂配', ph: 'Maråkvegen 35, 6216 Geiranger, Norway' },
  { k: 'status', label: '狀態', type: 'select', opts: [['', '—'], ['booked', '已訂'], ['todo', '未買/未搞']] },
  { k: 'note', label: '備註', type: 'area' }
];

/* ---------- Now (today) tab ---------- */
let nowTimer = null;
function parseHM(t) { const m = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
function todayISO() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function renderNow() {
  clearInterval(nowTimer);
  const el = $('#tab-now');
  const today = todayISO();
  let di = trip.days.findIndex(d => d.date === today);
  let isToday = di >= 0;
  if (di < 0) di = trip.days.findIndex(d => d.date > today);
  if (di < 0) di = trip.days.length - 1;
  const d = trip.days[di];
  if (!d) { el.innerHTML = '<p class="empty">未有行程。去「行程」tab 加，或者上載車票自動生成。</p>'; return; }
  const mins = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const nextIdx = () => {
    if (!isToday) return 0;
    const m = mins();
    const i = d.legs.findIndex(l => { const t = parseHM(l.t); return t !== null && t >= m; });
    return i < 0 ? d.legs.length - 1 : i;
  };
  function paint() {
    const ni = nextIdx();
    const l = d.legs[ni];
    if (!l) { el.innerHTML = '<p class="empty">呢日未有項目。</p>'; return; }
    const t = parseHM(l.t);
    let cd = '';
    if (isToday && t !== null) {
      const diff = t - mins();
      cd = diff > 0 ? `仲有 ${Math.floor(diff / 60) ? Math.floor(diff / 60) + '小時' : ''}${diff % 60}分鐘` : '時間到！';
    }
    const prev = d.legs[ni - 1];
    const origin = prev ? (prev.q || prev.loc) : '';
    const bigNav = origin
      ? `<a class="bignav" href="${mapsDir(origin, l.q || l.loc)}">🧭 帶我去（跟藍點行）</a>`
      : `<a class="bignav" href="${mapsSearch(l.q || l.loc)}">🧭 開地圖（跟藍點行）</a>`;
    el.innerHTML = `
      <div class="nowhead">
        <div class="nowdate">${esc(d.date)} · ${esc(d.label)}${isToday ? '' : '（未到嗰日 — 預習）'}</div>
        ${cd ? `<div class="nowcd">下一項 ${esc(l.t)} · <b>${cd}</b></div>` : ''}
      </div>
      <div class="nowcard">
        <div class="nowt">${esc(l.t)}</div>
        <div class="noww">${esc(l.what)}</div>
        <div class="ll">📍 <a href="${mapsSearch(l.q || l.loc)}">${esc(l.loc)}</a></div>
        ${l.note ? `<div class="ln">${esc(l.note)}</div>` : ''}
        ${bigNav}
      </div>
      ${d.legs.slice(ni + 1).map(x => `<div class="leg"><div class="lt">${esc(x.t)}</div><div class="lb"><div class="lw">${esc(x.what)}</div><div class="ll">📍 ${esc(x.loc)}</div></div></div>`).join('') || ''}
      <button class="add" onclick="location.hash='trip'">睇/改成個行程 →</button>`;
  }
  paint();
  nowTimer = setInterval(paint, 30000);
}

/* ---------- Trip tab ---------- */
function renderTrip() {
  const el = $('#tab-trip');
  if (!trip.days.length) { el.innerHTML = '<p class="empty">未有行程 — 撳「＋加一日」開始。</p>'; }
  el.innerHTML = `<div class="tripname">${esc(trip.name)} <button class="mini" id="renameTrip">改名</button></div>` +
    trip.days.map((d, di) => `
    <div class="day">
      <div class="dh"><b>${esc(d.date)}</b><span>${esc(d.label)}</span>
        <span class="dhb"><button class="mini" data-a="editDay" data-d="${di}">✏️</button><button class="mini" data-a="delDay" data-d="${di}">🗑</button></span></div>
      ${d.legs.map((l, li) => {
        const nxt = d.legs[li + 1];
        const warn = locPrecise(l.q) ? '' : ' <span class="b na">⚠️地址未夠精確</span>';
        const badge = l.status === 'booked' ? ' <span class="b ok">已訂</span>' : l.status === 'todo' ? ' <span class="b na">未買/未搞</span>' : '';
        const files = (l.fileIds || []).length ? ` <span class="b file">📎${l.fileIds.length}</span>` : '';
        return `<div class="leg">
          <div class="lt">${esc(l.t)}</div>
          <div class="lb">
            <div class="lw">${esc(l.what)}${badge}${files}</div>
            <div class="ll">📍 <a href="${mapsSearch(l.q || l.loc)}">${esc(l.loc)}</a>${warn}</div>
            ${l.note ? `<div class="ln">${esc(l.note)}</div>` : ''}
            <div class="la">
              ${nxt ? `<a class="chip go" href="${mapsDir(l.q || l.loc, nxt.q || nxt.loc)}">🧭 帶我去下一站（${esc(nxt.t)}）</a>` : ''}
              <button class="chip" data-a="editLeg" data-d="${di}" data-l="${li}">✏️ 改</button>
              <button class="chip" data-a="linkFile" data-d="${di}" data-l="${li}">📎 車票</button>
              <button class="chip" data-a="delLeg" data-d="${di}" data-l="${li}">🗑</button>
            </div>
          </div></div>`;
      }).join('')}
      <button class="add" data-a="addLeg" data-d="${di}">＋ 加一項</button>
    </div>`).join('') +
    `<button class="add big" id="addDay">＋ 加一日</button>`;
}

/* ---------- Files tab ---------- */
const TRANSPORT = { train: ['train', 'railway', 'tog'], bus: ['bus', 'buss'], boat: ['boat', 'ferry', 'cruise', 'båt', 'express boat'], flight: ['flight', 'airport', 'lufthavn', 'widerøe', 'sas'], activity: ['tour', 'kayak', 'zip', 'rib', 'gondola', 'hike'] };
async function analyzePDF(blob) {
  try {
    const pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
    let raw = '';
    for (let p = 1; p <= Math.min(pdf.numPages, 20); p++) {
      const c = await (await pdf.getPage(p)).getTextContent();
      raw += c.items.map(i => i.str).join(' ') + '\n';
    }
    // many ticket PDFs have per-character spacing; match on a densified copy
    const dense = raw.replace(/\s+/g, '');
    const tags = new Set();
    (dense.match(/\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*20\d{2}/gi) || []).slice(0, 4).forEach(x => tags.add('📅' + x));
    (dense.match(/20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}/g) || []).slice(0, 4).forEach(x => tags.add('📅' + x));
    (dense.match(/([01]?\d|2[0-3]):[0-5]\d/g) || []).slice(0, 8).forEach(x => tags.add('🕐' + x));
    (dense.match(/#[A-Z0-9]{5,12}(?![a-z])/g) || []).slice(0, 8).forEach(x => tags.add('🔖' + x));
    const low = dense.toLowerCase();
    const TR = { train: ['train', 'railway', 'tog'], bus: ['buss', 'bus'], boat: ['expressboat', 'boat', 'ferry', 'cruise'], flight: ['flight', 'airport', 'lufthavn', 'widerøe'], activity: ['kayak', 'zipline', 'zip', 'ribboat', 'gondola', 'hike', 'tour'] };
    for (const [k, ws] of Object.entries(TR)) if (ws.some(w => low.includes(w))) tags.add('🚌' + k);
    const meeting = [];
    const re = /meet(?:ing)?(?:point|place|up)?[:：]/gi;
    let mm; let guard = 0;
    while ((mm = re.exec(dense)) && guard++ < 6) meeting.push(dense.slice(mm.index, mm.index + 130));
    return { text: dense.slice(0, 8000), tags: [...tags], meeting };
  } catch (e) { return { text: '', tags: ['解析失敗'], meeting: [] }; }
}
async function renderFiles() {
  const el = $('#tab-files');
  const files = await DB.allFiles();
  el.innerHTML = `
    <label class="upl">📤 上載車票/文件（PDF·PNG·JPG）— 自動分析＋標籤<input type="file" id="fileIn" accept="application/pdf,image/*" multiple hidden></label>
    ${files.length ? '' : '<p class="empty">未有檔案。上載後會自動抽日期/時間/編號/集合點。</p>'}
    ${files.map(f => `
    <div class="fcard" data-id="${f.id}">
      <div class="fhead"><b>${esc(f.name)}</b>
        <span><button class="mini" data-a="openFile" data-id="${f.id}">開</button>
        <button class="mini" data-a="delF" data-id="${f.id}">🗑</button></span></div>
      <div class="ftags">${(f.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        <button class="tag addtag" data-a="addTag" data-id="${f.id}">＋標籤</button></div>
      ${(f.meeting || []).length ? `<div class="meet">🤝 票面集合資料（撳「＋」一鍵變行程項）：${f.meeting.map((m, mi) => `<div class="meetrow">${esc(m)} <button class="mini" data-a="meetToLeg" data-id="${f.id}" data-mi="${mi}">＋加入行程</button></div>`).join('')}</div>` : ''}
      <div class="fthumb" id="th${f.id}"></div>
    </div>`).join('')}`;
  $('#fileIn') && ($('#fileIn').onchange = onUpload);
  for (const f of files) {
    const box = $('#th' + f.id);
    if (!box) continue;
    if (f.type.startsWith('image/')) {
      const img = document.createElement('img'); img.src = URL.createObjectURL(fileBlob(f)); box.appendChild(img);
    } else if (f.type === 'application/pdf') {
      try {
        const pdf = await pdfjsLib.getDocument({ data: await fileBlob(f).arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 0.5 });
        const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
        await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
        box.appendChild(cv);
      } catch (e) {}
    }
  }
}
async function onUpload(ev) {
  for (const file of ev.target.files) {
    const buf = await file.arrayBuffer(); // ArrayBuffer survives IDB structured clone most reliably
    const rec = { name: file.name, type: file.type, buf, tags: [], meeting: [], ts: Date.now() };
    if (file.type === 'application/pdf') {
      toast('分析緊 ' + file.name + '…');
      Object.assign(rec, await analyzePDF(new Blob([rec.buf], { type: rec.type })));
    }
    await DB.addFile(rec);
  }
  toast('已儲存＋分析完成');
  renderFiles();
}

function fileBlob(f) { return f.blob || new Blob([f.buf], { type: f.type }); }
/* ---------- Spots tab ---------- */
function renderSpots() {
  $('#tab-spots').innerHTML =
    (trip.spots.length ? '' : '<p class="empty">未有打卡點。</p>') +
    trip.spots.map((s, i) => `
    <div class="leg spot"><div class="lt">${esc(s.when)}</div>
      <div class="lb"><div class="lw">📸 ${esc(s.title)}</div>
        ${s.note ? `<div class="ln">${esc(s.note)}</div>` : ''}
        <div class="la"><a class="chip" href="${imgSearch(s.q || s.title)}">🖼 睇遊客實拍</a>
        <button class="chip" data-a="editSpot" data-i="${i}">✏️</button>
        <button class="chip" data-a="delSpot" data-i="${i}">🗑</button></div>
      </div></div>`).join('') +
    '<button class="add big" id="addSpot">＋ 加打卡點</button>';
}

/* ---------- SOS tab ---------- */
function renderSOS() {
  $('#tab-sos').innerHTML =
    '<p class="hint">一撳即打。去外地前加定當地緊急號碼＋供應商電話。</p>' +
    trip.contacts.map((c, i) => `
    <div class="ccard"><div><b>${esc(c.name)}</b><small>${esc(c.note || '')}</small></div>
      <span><a class="call" href="tel:${esc(c.phone.replace(/\s/g, ''))}">☎ ${esc(c.phone)}</a>
      <button class="mini" data-a="delC" data-i="${i}">🗑</button></span></div>`).join('') +
    '<button class="add big" id="addC">＋ 加緊急聯絡</button>';
}

/* ---------- Share tab ---------- */
function shareLink() {
  const data = LZString.compressToEncodedURIComponent(JSON.stringify(trip));
  return location.href.split('#')[0] + '#t=' + data;
}
function renderShare() {
  const link = shareLink();
  const tooBig = link.length > 2300;
  $('#tab-share').innerHTML = `
    <div class="scard"><h3>📲 分享成個行程</h3>
      <p class="hint">連結入面已包成份行程資料（唔包檔案）。對方開一次＝匯入佢部機，之後離線照用。</p>
      <button class="add" id="copyShare">🔗 複製行程連結（${link.length}字元）</button>
      ${navigator.share ? '<button class="add" id="webShare">📤 直接分享（WhatsApp等）</button>' : ''}
      <div id="shareQR" class="qrbox">${tooBig ? '<p class="hint">行程太大，QR裝唔落 — 用複製連結。</p>' : ''}</div>
    </div>
    <div class="scard"><h3>💾 備份／還原（連檔案都可以）</h3>
      <button class="add" id="expJson">⬇️ 匯出行程檔（.json）</button>
      <label class="add" style="display:block;text-align:center">⬆️ 匯入行程檔<input type="file" id="impJson" accept=".json" hidden></label>
      <p class="hint">行程資料存喺部機（IndexedDB），冇網照用。轉機/換機用匯出檔搬。</p>
    </div>
    <div class="scard"><h3>🧹 重設</h3><button class="add danger" id="resetTrip">清空並載入示範行程</button></div>`;
  if (!tooBig && typeof qrcode === 'function') {
    try {
      const q = qrcode(0, 'M'); q.addData(link); q.make();
      $('#shareQR').innerHTML = q.createSvgTag({ cellSize: 3, margin: 3, scalable: true });
    } catch (e) { $('#shareQR').innerHTML = '<p class="hint">QR生成唔到（連結太長）— 用複製連結。</p>'; }
  }
}

/* ---------- actions ---------- */
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-a],[id]');
  if (!b) return;
  const a = b.dataset.a || b.id;
  const di = +b.dataset.d, li = +b.dataset.l, i = +b.dataset.i, id = +b.dataset.id;
  const acts = {
    async addDay() { const v = await form('加一日', [{ k: 'date', label: '日期', ph: '2026-07-13' }, { k: 'label', label: '當日標題', ph: 'Bergen 市內' }]); if (v) { trip.days.push({ ...v, legs: [] }); await save(); renderTrip(); } },
    async editDay() { const v = await form('改呢日', [{ k: 'date', label: '日期' }, { k: 'label', label: '標題' }], trip.days[di]); if (v) { Object.assign(trip.days[di], v); await save(); renderTrip(); } },
    async delDay() { if (confirm('刪成日？')) { trip.days.splice(di, 1); await save(); renderTrip(); } },
    async addLeg() { const v = await form('加一項', LEG_FIELDS); if (v) { trip.days[di].legs.push(v); await save(); renderTrip(); } },
    async editLeg() { const v = await form('修改', LEG_FIELDS, trip.days[di].legs[li]); if (v) { Object.assign(trip.days[di].legs[li], v); await save(); renderTrip(); } },
    async delLeg() { if (confirm('刪呢項？')) { trip.days[di].legs.splice(li, 1); await save(); renderTrip(); } },
    async linkFile() {
      const files = await DB.allFiles();
      if (!files.length) return toast('未有檔案 — 去「車票檔案」tab上載先');
      const v = await form('連結車票到呢一項', [{ k: 'fid', label: '揀檔案', type: 'select', opts: files.map(f => [String(f.id), f.name]) }]);
      if (v) { const l = trip.days[di].legs[li]; l.fileIds = [...new Set([...(l.fileIds || []), +v.fid])]; await save(); renderTrip(); toast('已連結'); }
    },
    async meetToLeg() {
      const f = (await DB.allFiles()).find(x => x.id === id);
      const m = f.meeting[+b.dataset.mi] || '';
      const venue = (m.split(/[:：]/)[1] || m).split(/Meet|Please|\./)[0].trim();
      const tGuess = (f.tags.find(t => t.startsWith('🕐')) || '').slice(2);
      const dayOpts = trip.days.map((d, i) => [String(i), d.date + ' ' + d.label]).concat([['new', '＋新一日']]);
      const v = await form('由車票生成行程項（可改）', [
        { k: 'day', label: '邊一日', type: 'select', opts: dayOpts },
        { k: 't', label: '時間', ph: '09:50' },
        { k: 'what', label: '事項' },
        { k: 'loc', label: '地點顯示名' },
        { k: 'q', label: '精確地址／座標', hint: '完整地址＋郵編＋國家，或「緯度,經度」' },
        { k: 'note', label: '備註', type: 'area' }
      ], { day: '0', t: tGuess, what: '集合：' + venue.slice(0, 40), loc: venue.slice(0, 60), q: venue.slice(0, 60), note: '來源：' + f.name });
      if (!v) return;
      let dd;
      if (v.day === 'new') { dd = { date: todayISO(), label: '新一日', legs: [] }; trip.days.push(dd); }
      else dd = trip.days[+v.day];
      dd.legs.push({ t: v.t, what: v.what, loc: v.loc, q: v.q, status: 'booked', note: v.note, fileIds: [f.id] });
      dd.legs.sort((a, b2) => (parseHM(a.t) ?? 9e9) - (parseHM(b2.t) ?? 9e9));
      await save(); toast('已加入行程'); showTab('trip');
    },
    async renameTrip() { const v = await form('行程名', [{ k: 'name', label: '名' }, { k: 'country', label: '國家（地址precision檢查用）' }], trip); if (v) { Object.assign(trip, v); await save(); renderTrip(); } },
    async addSpot() { const v = await form('加打卡點', [{ k: 'when', label: '幾時' }, { k: 'title', label: '咩位' }, { k: 'q', label: '圖庫搜尋字' }, { k: 'note', label: '注意', type: 'area' }]); if (v) { trip.spots.push(v); await save(); renderSpots(); } },
    async editSpot() { const v = await form('改打卡點', [{ k: 'when', label: '幾時' }, { k: 'title', label: '咩位' }, { k: 'q', label: '圖庫搜尋字' }, { k: 'note', label: '注意', type: 'area' }], trip.spots[i]); if (v) { Object.assign(trip.spots[i], v); await save(); renderSpots(); } },
    async delSpot() { trip.spots.splice(i, 1); await save(); renderSpots(); },
    async addC() { const v = await form('加聯絡', [{ k: 'name', label: '邊個' }, { k: 'phone', label: '電話' }, { k: 'note', label: '備註' }]); if (v) { trip.contacts.push(v); await save(); renderSOS(); } },
    async delC() { trip.contacts.splice(i, 1); await save(); renderSOS(); },
    async openFile() { const f = (await DB.allFiles()).find(x => x.id === id); if (f) window.open(URL.createObjectURL(fileBlob(f))); },
    async delF() { if (confirm('刪檔案？')) { await DB.delFile(id); renderFiles(); } },
    async addTag() { const f = (await DB.allFiles()).find(x => x.id === id); const t = prompt('新標籤：'); if (t) { f.tags.push(t); await DB.putFile(f); renderFiles(); } },
    async copyShare() { try { await navigator.clipboard.writeText(shareLink()); toast('已複製'); } catch (e) { prompt('長按複製：', shareLink()); } },
    async webShare() { try { await navigator.share({ title: trip.name, url: shareLink() }); } catch (e) {} },
    async expJson() {
      const files = await DB.allFiles();
      const payload = { trip, files: await Promise.all(files.map(async f => ({ name: f.name, type: f.type, tags: f.tags, meeting: f.meeting, b64: await blobToB64(fileBlob(f)) }))) };
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      a.download = 'trip-backup.json'; a.click();
    },
    async resetTrip() { if (confirm('清空並載入示範？')) { trip = JSON.parse(JSON.stringify(SEED)); await save(); location.hash = ''; showTab('trip'); } }
  };
  if (acts[a]) { ev.preventDefault(); await acts[a](); }
});
document.addEventListener('change', async ev => {
  if (ev.target.id === 'impJson') {
    const f = ev.target.files[0]; if (!f) return;
    const payload = JSON.parse(await f.text());
    trip = payload.trip; await save();
    if (payload.files) for (const pf of payload.files) await DB.addFile({ name: pf.name, type: pf.type, tags: pf.tags || [], meeting: pf.meeting || [], blob: b64ToBlob(pf.b64, pf.type), ts: Date.now() });
    toast('匯入完成'); showTab('trip');
  }
});
const blobToB64 = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(b); });
function b64ToBlob(b64, type) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); }

/* ---------- tabs + boot ---------- */
const TABS = { now: renderNow, trip: renderTrip, files: renderFiles, spots: renderSpots, sos: renderSOS, share: renderShare };
function showTab(name) {
  document.querySelectorAll('.tabc').forEach(t => t.classList.toggle('on', t.id === 'tab-' + name));
  document.querySelectorAll('#tabbar a').forEach(t => t.classList.toggle('on', t.dataset.t === name));
  TABS[name]();
}
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS[h]) showTab(h); });

(async function boot() {
  if (typeof pdfjsLib !== 'undefined') pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  // import from share link
  const m = location.hash.match(/[#&]t=([A-Za-z0-9+\-$_%.!*'()]+)/);
  if (m) {
    try {
      const incoming = JSON.parse(LZString.decompressFromEncodedURIComponent(m[1]));
      if (incoming && incoming.days && confirm('收到分享行程「' + incoming.name + '」— 匯入並取代本機行程？')) {
        trip = incoming; await save();
      }
      history.replaceState(null, '', location.pathname);
    } catch (e) {}
  }
  if (!trip) trip = (await DB.getKV('trip')) || JSON.parse(JSON.stringify(SEED));
  await save();
  document.querySelectorAll('#tabbar a').forEach(a => a.addEventListener('click', () => showTab(a.dataset.t)));
  const h0 = location.hash.slice(1);
  showTab(TABS[h0] ? h0 : 'now');
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('./sw.js').catch(() => {}); } catch (e) {} }
})();
