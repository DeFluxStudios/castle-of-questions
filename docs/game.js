// Castle of Questions: game engine.
(function () {
'use strict';

const $ = id => document.getElementById(id);
const DIRS = ['N', 'E', 'S', 'W'], DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const NONE = 0, CLOSED = 1, OPEN = 2, LOCKED = 3;
const THEMES = ['stone', 'timber', 'library', 'royal'];
const MODES = {
  short:   { label: 'Tower',   size: 6,  floors: 3 },
  classic: { label: 'Keep',    size: 8,  floors: 4 },
  grand:   { label: 'Citadel', size: 10, floors: 5 }
};
const LEVELS = ['', 'Page', 'Squire', 'Knight', 'Sovereign'];
const TIMER = [0, 40, 35, 30, 25];
const PAINTINGS = 24;
const SAVE_KEY = 'coq_save_v2', SCORE_KEY = 'coq_scores_v2';

const CHARS = {
  jester:    { name: 'Pip the Jester', lines: ['Why did the scholar sit on the clock? To be on time!', 'A riddle a day keeps the dungeon away.', 'Hee hee! Mind the locked doors, they hold grudges.'] },
  knight:    { name: 'Sir Aldous', lines: ['Courage, traveler. Every door yields to a sharp mind.', 'I once answered nine questions in a row. Then I lost my helmet.', 'Stairs lead upward, and upward leads to the throne.'] },
  wizard:    { name: 'Magister Orrin', lines: ['Knowledge is the only spell that never fades.', 'Hmm. You have the look of someone who reads.', 'The castle rearranges itself for every visitor, you know.'] },
  monk:      { name: 'Brother Anselm', lines: ['Patience. A wrong answer teaches as much as a right one.', 'I copy books by candlelight. Ask me anything. Well, almost.', 'Peace be upon your wanderings.'] },
  cook:      { name: 'Mistress Hearth', lines: ['Hungry? Answer right and you will feast in the great hall!', 'Too many cooks? Never. Too few questions? Always.', 'Mind the soup. It is older than the castle.'] },
  bard:      { name: 'Wren the Bard', lines: ['I am writing a ballad about you. Do not disappoint me.', 'Every great tale has a staircase in it.', 'Tra-la! A lute, a question, a door.'] },
  lady:      { name: 'Lady Isolde', lines: ['The court wonders who will reach the throne first.', 'Curiosity is a noble virtue.', 'The paintings here are lovely. Do look at them.'] },
  alchemist: { name: 'Old Varro', lines: ['Lead into gold? No. Wrong answers into lessons? Yes.', 'Careful, that flask is not for drinking.', 'Facts are the only reagents that never spoil.'] },
  parrot:    { name: 'Captain Squawk', lines: ['Squawk! Pieces of eight! Pieces of eight!', 'Squawk! The answer is… squawk! I forget.', 'Pretty bird! Clever traveler!'] },
  owl:       { name: 'Professor Hoot', lines: ['Whoo goes there? A scholar, I hope.', 'I study at night. You should try it.', 'Wisdom favors the well-read.'] },
  cat:       { name: 'Mouser', lines: ['Mrrrow. (The cat ignores you magnificently.)', 'Purr. (The cat seems to approve of you.)', 'The cat blinks slowly. You feel encouraged.'] },
  ghost:     { name: 'The Grey Lady', lines: ['Ooooh… I have wandered these halls for centuries.', 'Ooooh… so many questions I never answered…', 'I drift where I please. Perhaps we shall meet again.'] }
};
const CHAR_KINDS = Object.keys(CHARS);
const PAINT_KIND = ['landscape', 'sunset', 'lake', 'sea', 'stilllife', 'geometric'];
const PAINT_TITLES = {
  landscape: ['Morning in the Hills', 'The High Pasture', 'Pines Beneath the Peak', 'A Quiet Valley'],
  sunset: ['Dusk over the Ridge', 'Evening Fire', 'The Last Light', 'Violet Hour'],
  lake: ['Still Water', 'The Mirror Lake', 'Reflections at Noon', 'Lakeside Pines'],
  sea: ['A Fair Wind', 'The Lone Sail', 'Open Water', 'Homeward Bound'],
  stilllife: ['Fruit and Pewter', 'The Harvest Bowl', 'Kitchen Table', 'Autumn Plenty'],
  geometric: ['Composition in Primaries', 'Grid and Gold', 'Order No. 7', 'Squares in Conversation']
};
const PAINTERS = ['Master of the Keep', 'A. van Torre', 'Sister Clementia', 'Giacomo Fresco', 'The Duke\'s Painter', 'Unknown artist'];
const ROOM_ADJ = ['Blue', 'Gilded', 'Old', 'Long', 'Quiet', 'Eastern', 'Western', 'Lower', 'Upper', 'Painted', 'Silver', 'Crimson', 'Hidden', 'Little', 'Great', 'North', 'South', 'Mossy', 'Golden', 'Shadowed'];
const ROOM_NOUN = ['Hall', 'Armory', 'Library', 'Chapel', 'Gallery', 'Kitchen', 'Cellar', 'Map Room', 'Solar', 'Guard Room', 'Scriptorium', 'Treasury', 'Music Room', 'Buttery', 'Mews', 'Laboratory', 'Tapestry Room', 'Observatory', 'Bell Chamber', 'Nursery', 'Pantry', 'Cloister', 'Bower', 'Watch Room', 'Clock Room', 'Lantern Room', 'Still Room', 'Wardrobe', 'Counting House', 'Study'];

// ------------------------------------------------------------ state
let S = null;         // whole game state (serializable)
let busy = false, timerId = null;
let settings = loadJSON('coq_settings', { mode: 'classic', level: 2, timer: true, cats: Object.keys(window.CATEGORIES) });

function loadJSON(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function dropKey(k) { try { localStorage.removeItem(k); } catch (e) {} }

function rnd(n) { return Math.floor(Math.random() * n); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const F = () => S.floors[S.floor];
function idx(x, y) { return y * F().size + x; }
function neighbor(c, d) {
  const n = F().size, x = c % n + DX[d], y = Math.floor(c / n) + DY[d];
  return (x < 0 || y < 0 || x >= n || y >= n) ? -1 : y * n + x;
}
function ek(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
function door(c, d) { const n = neighbor(c, d); if (n < 0) return NONE; const v = F().edges[ek(c, n)]; return v === undefined ? NONE : v; }
function setDoor(c, d, v) { F().edges[ek(c, neighbor(c, d))] = v; }

// ------------------------------------------------------------ castle generation
function makeFloor(size, number, entry) {
  const N = size * size, edges = {};
  const seen = new Array(N).fill(false), stack = [entry];
  const nb = (c, d) => { const x = c % size + DX[d], y = Math.floor(c / size) + DY[d]; return (x < 0 || y < 0 || x >= size || y >= size) ? -1 : y * size + x; };
  seen[entry] = true;
  while (stack.length) {
    const c = stack[stack.length - 1];
    const opts = shuffle([0, 1, 2, 3]).map(d => nb(c, d)).filter(n => n >= 0 && !seen[n]);
    if (!opts.length) { stack.pop(); continue; }
    edges[ek(c, opts[0])] = CLOSED; seen[opts[0]] = true; stack.push(opts[0]);
  }
  const extra = Math.round(N * 0.3);
  for (let k = 0, t = 0; k < extra && t < 2000; t++) {
    const c = rnd(N), n = nb(c, rnd(4));
    if (n >= 0 && edges[ek(c, n)] === undefined) { edges[ek(c, n)] = CLOSED; k++; }
  }
  // give the entry room at least two ways out
  for (const d of shuffle([0, 1, 2, 3])) {
    if ([0, 1, 2, 3].filter(k => { const n = nb(entry, k); return n >= 0 && edges[ek(entry, n)] !== undefined; }).length >= 2) break;
    const n = nb(entry, d); if (n >= 0) edges[ek(entry, n)] = CLOSED;
  }
  // stairs: the room farthest (by doors) from the entry
  const dist = new Array(N).fill(-1); dist[entry] = 0; const q = [entry];
  while (q.length) { const c = q.shift(); for (let d = 0; d < 4; d++) { const n = nb(c, d); if (n >= 0 && edges[ek(c, n)] !== undefined && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); } } }
  const far = Math.max(...dist), cands = dist.map((v, i) => [v, i]).filter(([v]) => v >= far - 2).map(([, i]) => i);
  const exit = cands[rnd(cands.length)];
  const pool = shuffle([...Array(N).keys()].filter(i => i !== entry && i !== exit));
  const keyCount = Math.max(1, Math.round(size / 3));
  const keys = pool.splice(0, keyCount);
  const chars = {};
  const charCount = Math.round(N * 0.12);
  for (let i = 0; i < charCount && pool.length; i++) chars[pool.pop()] = CHAR_KINDS[i % (CHAR_KINDS.length - 1)];
  chars[pool.pop()] = 'ghost';
  const paintings = {};
  for (let i = 0; i < N; i++) if (Math.random() < 0.55) paintings[i] = rnd(PAINTINGS);
  const names = [];
  for (let i = 0; i < N; i++) names.push(`the ${ROOM_ADJ[rnd(ROOM_ADJ.length)]} ${ROOM_NOUN[rnd(ROOM_NOUN.length)]}`);
  return { size, number, theme: THEMES[number % THEMES.length], edges, entry, exit, keys, chars, talked: [], paintings, names, visited: [entry] };
}

function newGame() {
  const m = MODES[settings.mode];
  const corners = [0, m.size - 1, m.size * (m.size - 1), m.size * m.size - 1];
  S = {
    v: 2, settings: JSON.parse(JSON.stringify(settings)),
    floors: [makeFloor(m.size, 0, corners[rnd(4)])], floor: 0, totalFloors: m.floors,
    facing: 0, score: 0, keys: 1, hints: 1, answered: 0, correct: 0, streak: 0, best: 0,
    deck: [], over: false, started: Date.now()
  };
  S.pos = F().entry; S.facing = faceInward(S.pos);
  persist(); render();
  say(`You stand in ${F().names[S.pos]}. Find the staircase up; it marks itself ⇧ on your map once you've found it. Talk to the people you meet. Some will help.`);
}

function faceInward(c) {
  const n = F().size, x = c % n, y = Math.floor(c / n);
  return y < n / 2 ? 2 : 0;
}

function persist() { if (S && !S.over) saveJSON(SAVE_KEY, S); }

// ------------------------------------------------------------ questions
function pickQuestion() {
  const Q = window.QUESTIONS, lvl = S.settings.level, cats = new Set(S.settings.cats);
  if (!S.deck.length) {
    let pool = Q.map((q, i) => i).filter(i => cats.has(Q[i][0]) && Math.abs(Q[i][1] - lvl) <= 1);
    // weight: exact level appears twice as often
    pool = pool.concat(pool.filter(i => Q[i][1] === lvl));
    if (!pool.length) pool = Q.map((q, i) => i);
    S.deck = shuffle([...new Set(pool)]).concat(shuffle(pool.filter(i => Q[i][1] === lvl)));
    S.deck = [...new Set(S.deck)];
  }
  return Q[S.deck.pop()];
}

// ------------------------------------------------------------ rendering
function doorSvg(slot, st) {
  if (st === NONE) return '';
  let path, cx, cy;
  if (slot === 1) { path = 'M330,400 L330,250 Q400,186 470,250 L470,400 Z'; cx = 400; cy = 312; }
  else {
    const L = [[60, 166], [140, 180], [140, 436], [60, 484]];
    const P = slot === 0 ? L : L.map(([x, y]) => [800 - x, y]);
    path = 'M' + P.map(p => p.join(',')).join(' L') + ' Z'; cx = slot === 0 ? 100 : 700; cy = 316;
  }
  let body = `<path d="${path}" fill="${st === OPEN ? '#050403' : 'url(#wd)'}" stroke="#1e1006" stroke-width="5"/>`;
  if (st === OPEN) body += `<path d="${path}" fill="url(#gl)"/>`;
  if (st === LOCKED) {
    const xs = slot === 1 ? [350, 380, 410, 440] : slot === 0 ? [76, 100, 124] : [676, 700, 724];
    body += xs.map(x => `<line x1="${x}" y1="${slot === 1 ? 210 : 176}" x2="${x}" y2="${slot === 1 ? 400 : 470}" stroke="#262626" stroke-width="8"/>`).join('');
    body += `<path d="${path}" fill="#d2533f" opacity=".22"/><text x="${cx}" y="${cy + 12}" font-size="34" text-anchor="middle">🔒</text>`;
  }
  if (st === CLOSED) body += `<circle cx="${cx}" cy="${cy}" r="22" fill="#e3b54a" stroke="#5a3a12" stroke-width="4"/><text x="${cx}" y="${cy + 10}" font-size="28" text-anchor="middle" fill="#3a240c" font-weight="bold" font-family="Georgia">?</text>`;
  return `<g class="hot" data-door="${slot}">${body}</g>`;
}

function render() {
  const f = F(), c = S.pos, fc = S.facing, L = (fc + 3) % 4, R = (fc + 1) % 4;
  let svg = `<defs>
    <pattern id="wd" width="28" height="80" patternUnits="userSpaceOnUse"><rect width="28" height="80" fill="#7a4a22"/><rect x="26" width="2" height="80" fill="#4a2b12"/><rect x="7" y="16" width="2" height="40" fill="#8c5a2e" opacity=".6"/></pattern>
    <radialGradient id="gl" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#e3b54a" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <image href="assets/room_${f.theme}.jpg" x="0" y="0" width="800" height="520"/>`;
  if (f.paintings[c] !== undefined) {
    svg += `<image class="hot" data-paint="1" href="assets/painting_${String(f.paintings[c]).padStart(2, '0')}.png" x="352" y="112" width="96" height="70"/>`;
  }
  svg += doorSvg(0, door(c, L)) + doorSvg(1, door(c, fc)) + doorSvg(2, door(c, R));
  if (c === f.exit) svg += `<image class="hot" data-stairs="1" href="assets/stairs.png" x="196" y="282" width="134" height="124"/>`;
  if (f.chars[c]) svg += `<image class="hot" data-char="1" href="assets/char_${f.chars[c]}.png" x="482" y="276" width="126" height="168"/>`;
  $('view').innerHTML = svg;
  $('view').querySelectorAll('[data-door]').forEach(g => g.addEventListener('click', () => tryDoor(+g.dataset.door)));
  $('view').querySelectorAll('[data-char]').forEach(g => g.addEventListener('click', talk));
  $('view').querySelectorAll('[data-paint]').forEach(g => g.addEventListener('click', viewPainting));
  $('view').querySelectorAll('[data-stairs]').forEach(g => g.addEventListener('click', climb));
  const name = f.names[c];
  $('roomName').textContent = name.charAt(0).toUpperCase() + name.slice(1);
  $('score').textContent = S.score;
  $('floor').textContent = (S.floor + 1) + '/' + S.totalFloors;
  $('keys').textContent = S.keys;
  $('hints').textContent = S.hints;
  $('right').textContent = S.correct + '/' + S.answered;
  $('facing').textContent = DIRS[fc];
  $('bs').hidden = c !== f.exit;
  renderMap();
}

function renderMap() {
  const f = F(), n = f.size, cs = 26, pad = 4, W = n * cs + pad * 2;
  const vis = new Set(f.visited);
  let s = `<svg viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg">`;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const c = y * n + x, v = vis.has(c);
    s += `<rect x="${pad + x * cs + 2}" y="${pad + y * cs + 2}" width="${cs - 4}" height="${cs - 4}" rx="3" fill="${v ? '#4a3a26' : '#1a140e'}" stroke="#3a2c1c"/>`;
    if (v && f.chars[c] && c !== S.pos) s += `<text x="${pad + x * cs + cs / 2}" y="${pad + y * cs + cs / 2 + 5}" font-size="13" text-anchor="middle" fill="#cdb98f">☺</text>`;
  }
  const col = { 1: '#8a5a2b', 2: '#5fbf6a', 3: '#d2533f' };
  for (const k in f.edges) {
    const [a, b] = k.split('-').map(Number);
    if (!vis.has(a) && !vis.has(b)) continue;
    const ax = a % n, ay = Math.floor(a / n), bx = b % n, by = Math.floor(b / n);
    const mx = pad + ((ax + bx) / 2 + .5) * cs, my = pad + ((ay + by) / 2 + .5) * cs;
    s += ay === by ? `<rect x="${mx - 3}" y="${my - 6}" width="6" height="12" fill="${col[f.edges[k]]}" rx="1"/>`
                   : `<rect x="${mx - 6}" y="${my - 3}" width="12" height="6" fill="${col[f.edges[k]]}" rx="1"/>`;
  }
  if (vis.has(f.exit)) {
    const ex = f.exit % n, ey = Math.floor(f.exit / n);
    s += `<text x="${pad + ex * cs + cs / 2}" y="${pad + ey * cs + cs / 2 + 6}" font-size="17" text-anchor="middle" fill="#f6d983" font-weight="bold">⇧</text>`;
  }
  const px = pad + (S.pos % n + .5) * cs, py = pad + (Math.floor(S.pos / n) + .5) * cs;
  s += `<g transform="translate(${px},${py}) rotate(${S.facing * 90})"><polygon points="0,-9 7,7 0,3 -7,7" fill="#e3b54a" stroke="#2a1d0c"/></g></svg>`;
  $('map').innerHTML = s;
}

function say(t) { $('msg').textContent = t; }

// ------------------------------------------------------------ actions
function blocked() { return busy || !S || S.over || $('qOv').classList.contains('show') || $('infoOv').classList.contains('show'); }

function turn(d) {
  if (blocked()) return;
  S.facing = (S.facing + d + 4) % 4; persist(); render();
  say(`You face ${['north', 'east', 'south', 'west'][S.facing]}.`);
}

function slotDir(slot) { return slot === 1 ? S.facing : slot === 0 ? (S.facing + 3) % 4 : (S.facing + 1) % 4; }

function tryDoor(slot) {
  if (blocked()) return;
  const d = slotDir(slot), st = door(S.pos, d);
  if (st === NONE) return say('Only solid wall that way.');
  if (st === OPEN) return walk(d);
  if (st === LOCKED) {
    if (S.keys > 0) return info(`<h2>A barred door</h2><p>Iron bars block the way. Use one of your ${S.keys} key${S.keys > 1 ? 's' : ''}?</p>`,
      [['Use a key', () => { S.keys--; setDoor(S.pos, d, OPEN); persist(); render(); say('The key turns with a clunk. The way is open.'); }], ['Not now', null]]);
    return say('This door is barred. A key would open it.');
  }
  ask(d);
}

function walk(d) {
  busy = true; $('view').classList.add('fade');
  setTimeout(() => {
    const f = F();
    S.pos = neighbor(S.pos, d);
    if (!f.visited.includes(S.pos)) f.visited.push(S.pos);
    let m = `You enter ${f.names[S.pos]}.`;
    const ki = f.keys.indexOf(S.pos);
    if (ki >= 0) { f.keys.splice(ki, 1); S.keys++; S.score += 50; m += ' A brass key glints on the floor. You take it. (+50)'; }
    moveGhost();
    if (f.chars[S.pos]) m += ` ${CHARS[f.chars[S.pos]].name} is here.`;
    if (S.pos === f.exit) m += ' A staircase leads up!';
    persist(); render(); $('view').classList.remove('fade'); busy = false; say(m);
  }, 200);
}

function moveGhost() {
  const f = F();
  const g = Object.keys(f.chars).find(k => f.chars[k] === 'ghost');
  if (g === undefined || Math.random() < 0.5) return;
  const c = +g, d = rnd(4), n = neighbor(c, d);
  if (n < 0 || door(c, d) === NONE || f.chars[n] || n === f.exit) return;
  delete f.chars[c]; f.chars[n] = 'ghost';
}

function talk() {
  if (blocked()) return;
  const f = F(), kind = f.chars[S.pos], ch = CHARS[kind];
  const key = kind + '@' + S.pos;
  let gift = '';
  if (!f.talked.includes(kind === 'ghost' ? 'ghost' : key)) {
    f.talked.push(kind === 'ghost' ? 'ghost' : key);
    const r = Math.random();
    if (kind === 'ghost' || r < 0.18) { S.keys++; gift = `<p><b>${ch.name} gives you a key.</b></p>`; }
    else if (r < 0.7) { S.hints++; gift = `<p><b>${ch.name} whispers a secret: +1 hint.</b> A hint removes two wrong answers.</p>`; }
    else { S.score += 100 * S.settings.level; gift = `<p><b>${ch.name} cheers you on: +${100 * S.settings.level} points.</b></p>`; }
  }
  const line = ch.lines[rnd(ch.lines.length)];
  persist(); render();
  info(`<img class="portrait" src="assets/char_${kind}.png" alt=""><h2>${ch.name}</h2><p>“${line}”</p>${gift}<div style="clear:both"></div>`, [['Farewell', null]]);
}

function viewPainting() {
  if (blocked()) return;
  const i = F().paintings[S.pos], kind = PAINT_KIND[i % PAINT_KIND.length];
  const title = PAINT_TITLES[kind][Math.floor(i / PAINT_KIND.length) % 4];
  const painter = PAINTERS[i % PAINTERS.length];
  info(`<img class="wide" src="assets/painting_${String(i).padStart(2, '0')}.png" alt=""><h2 style="margin-top:10px">${title}</h2><p class="small">${painter}. Oil on panel, from the castle collection.</p>`, [['Back', null]]);
}

function climb() {
  if (blocked() || S.pos !== F().exit) return;
  const bonus = 300 * S.settings.level;
  S.score += bonus;
  if (S.floor + 1 >= S.totalFloors) return win(bonus);
  busy = true; $('view').classList.add('fade');
  setTimeout(() => {
    const prevExit = F().exit, n = F().size;
    S.floors.push(makeFloor(n, S.floor + 1, prevExit));
    S.floors[S.floor] = { size: n, number: S.floor, done: true };   // drop old floor detail to keep saves small
    S.floor++;
    S.pos = F().entry; S.facing = faceInward(S.pos);
    persist(); render(); $('view').classList.remove('fade'); busy = false;
    say(`You climb to floor ${S.floor + 1} of ${S.totalFloors}. (+${bonus}) The rooms here look different…`);
  }, 250);
}

// ------------------------------------------------------------ question dialog
function ask(d) {
  const [cat, lvl, text, answer, ...wrong] = pickQuestion();
  const order = shuffle([answer, ...wrong]);
  $('qCat').textContent = window.CATEGORIES[cat];
  $('qLvl').textContent = LEVELS[lvl];
  $('qText').textContent = text;
  $('qVerdict').textContent = '';
  $('qOk').hidden = true;
  const hb = $('qHint'); hb.hidden = false; hb.disabled = S.hints < 1; hb.textContent = `Use a hint (${S.hints})`;
  const box = $('qOpts'); box.innerHTML = '';
  let done = false;
  const finish = (picked) => {
    if (done) return; done = true;
    clearInterval(timerId);
    hb.hidden = true;
    [...box.children].forEach(b => { b.disabled = true; if (b.textContent === answer) b.classList.add('right'); });
    S.answered++;
    if (picked === answer) {
      S.correct++; S.streak++; S.best = Math.max(S.best, S.streak);
      const L = S.settings.level, pts = 100 * L + 20 * L * Math.min(S.streak - 1, 5);
      S.score += pts; setDoor(S.pos, d, OPEN);
      $('qVerdict').innerHTML = `<span style="color:var(--green)">Correct! The door swings open.</span> +${pts}${S.streak > 1 ? ` · streak ${S.streak}` : ''}`;
      $('qOk').onclick = () => { close('qOv'); persist(); render(); walk(d); };
    } else {
      S.streak = 0; setDoor(S.pos, d, LOCKED);
      [...box.children].forEach(b => { if (b.textContent === picked) b.classList.add('wrong'); });
      $('qVerdict').innerHTML = `<span style="color:var(--red)">${picked === null ? 'Time is up!' : 'Wrong.'}</span> The answer was <b>${answer}</b>. The door slams and locks.`;
      $('qOk').onclick = () => { close('qOv'); persist(); render(); say('That door is barred now. Find another way, or a key.'); checkTrapped(); };
    }
    $('qOk').hidden = false; persist();
  };
  order.forEach(o => { const b = document.createElement('button'); b.textContent = o; b.onclick = () => finish(o); box.appendChild(b); });
  hb.onclick = () => {
    if (S.hints < 1 || done) return;
    S.hints--; hb.disabled = true; hb.textContent = `Use a hint (${S.hints})`;
    shuffle([...box.children].filter(b => b.textContent !== answer)).slice(0, 2).forEach(b => { b.classList.add('gone'); b.disabled = true; });
    $('hints').textContent = S.hints;
  };
  // timer
  const total = S.settings.timer ? TIMER[S.settings.level] : 0;
  $('qTimer').style.display = total ? 'block' : 'none';
  $('qTimer').classList.remove('low');
  clearInterval(timerId);
  if (total) {
    const end = Date.now() + total * 1000;
    $('qBar').style.width = '100%';
    timerId = setInterval(() => {
      const left = (end - Date.now()) / 1000;
      $('qBar').style.width = Math.max(0, left / total * 100) + '%';
      if (left < 8) $('qTimer').classList.add('low');
      if (left <= 0) finish(null);
    }, 250);
  }
  $('qOv').classList.add('show');
}

// ------------------------------------------------------------ win / lose
function reachable() {
  const seen = new Set([S.pos]), q = [S.pos];
  while (q.length) { const c = q.shift(); for (let d = 0; d < 4; d++) { const st = door(c, d); if (st === CLOSED || st === OPEN) { const n = neighbor(c, d); if (!seen.has(n)) { seen.add(n); q.push(n); } } } }
  return seen;
}
function checkTrapped() {
  const f = F(), r = reachable();
  if (r.has(f.exit) || S.keys > 0) return;
  if (f.keys.some(k => r.has(k))) return;
  if (Object.keys(f.chars).some(k => r.has(+k) && !f.talked.includes(f.chars[k] === 'ghost' ? 'ghost' : f.chars[k] + '@' + k))) return;
  const price = 400 * S.settings.level;
  const opts = [];
  if (S.score >= price) opts.push([`Buy a skeleton key (−${price})`, () => { S.score -= price; S.keys++; persist(); render(); say('A shadowy locksmith sells you a skeleton key.'); }]);
  opts.push(['Accept defeat', () => endGame(false)]);
  info(`<h2>Trapped!</h2><p>Every way to the stairs is barred, and no key or friendly face is within reach.</p>${S.score >= price ? `<p>A shadowy locksmith offers a skeleton key for ${price} points.</p>` : ''}`, opts);
}

function win(bonus) {
  const finale = 1000 * S.settings.level + S.keys * 100;
  S.score += finale;
  endGame(true, bonus + finale);
}

function endGame(won, bonus) {
  S.over = true; dropKey(SAVE_KEY);
  const scores = loadJSON(SCORE_KEY, []);
  const entry = { score: S.score, mode: MODES[S.settings.mode].label, level: LEVELS[S.settings.level], floor: S.floor + 1, won, date: new Date().toISOString().slice(0, 10) };
  scores.push(entry); scores.sort((a, b) => b.score - a.score); saveJSON(SCORE_KEY, scores.slice(0, 10));
  render();
  const pct = S.answered ? Math.round(S.correct / S.answered * 100) : 0;
  const head = won
    ? `<img class="wide" src="assets/throne.jpg" alt=""><h2 style="margin-top:10px">The throne is yours!</h2><p>You climbed every floor of the ${entry.mode} and reached the throne room. The court bows. (+${bonus})</p>`
    : `<h2>Your quest ends here</h2><p>You reached floor ${S.floor + 1} of ${S.totalFloors}.</p>`;
  info(`${head}<p>Final score: <b>${S.score}</b><br>Questions: ${S.correct}/${S.answered} (${pct}%) · best streak ${S.best}</p>`,
    [['High scores', showScores], ['New castle', showMenu]]);
}

// ------------------------------------------------------------ menus
function close(id) { $(id).classList.remove('show'); }
function info(html, buttons) {
  const card = $('infoCard'); card.innerHTML = html;
  const row = document.createElement('div'); row.className = 'row';
  buttons.forEach(([label, fn], i) => {
    const b = document.createElement('button'); b.textContent = label; if (i === 0) b.className = 'primary';
    b.onclick = () => { close('infoOv'); if (fn) fn(); }; row.appendChild(b);
  });
  card.appendChild(row); $('infoOv').classList.add('show');
}

function showScores() {
  const s = loadJSON(SCORE_KEY, []);
  const rows = s.length ? s.map((e, i) => `<tr><td>${i + 1}.</td><td><b>${e.score}</b></td><td>${e.mode} · ${e.level}</td><td>${e.won ? '👑' : 'Floor ' + e.floor}</td></tr>`).join('') : '<tr><td>No scores yet.</td></tr>';
  info(`<h2>High scores</h2><table class="scores">${rows}</table><p class="small">Saved in this browser only.</p>`, [['Back', showMenu]]);
}

function showMenu() {
  const saved = loadJSON(SAVE_KEY, null);
  const cats = window.CATEGORIES;
  const html = `<img class="wide" src="assets/title.jpg" alt="">
    <h2 style="margin-top:10px">Castle of Questions</h2>
    <p class="small">Answer the question at each door to open it. A wrong answer bars it for good. Find the stairs on every floor and climb to the throne.</p>
    <div class="label">Castle</div>
    <div class="seg" id="mMode">${Object.entries(MODES).map(([k, m]) => `<button data-v="${k}" class="${settings.mode === k ? 'sel' : ''}">${m.label}<br><span class="small">${m.floors} floors · ${m.size}×${m.size}</span></button>`).join('')}</div>
    <div class="label">Difficulty</div>
    <div class="seg" id="mLevel">${[1, 2, 3, 4].map(l => `<button data-v="${l}" class="${settings.level === l ? 'sel' : ''}">${LEVELS[l]}</button>`).join('')}</div>
    <div class="label">Subjects</div>
    <div class="chips" id="mCats">${Object.entries(cats).map(([k, v]) => `<button data-v="${k}" class="${settings.cats.includes(k) ? 'sel' : ''}">${v}</button>`).join('')}</div>
    <div class="seg"><button id="mTimer" class="${settings.timer ? 'sel' : ''}">⏳ Timer ${settings.timer ? 'on' : 'off'}</button><button id="mScores">🏆 High scores</button></div>`;
  const btns = [];
  if (saved && !saved.over) btns.push([`Continue (floor ${saved.floor + 1}, ${saved.score} pts)`, () => { S = saved; render(); say('Welcome back. The castle remembers you.'); }]);
  btns.push(['Enter a new castle', () => { saveJSON('coq_settings', settings); newGame(); }]);
  if (S && !S.over && !(saved && !saved.over)) btns.push(['Back to game', null]);
  info(html, btns);
  const card = $('infoCard');
  card.querySelectorAll('#mMode button').forEach(b => b.onclick = () => { settings.mode = b.dataset.v; card.querySelectorAll('#mMode button').forEach(x => x.classList.toggle('sel', x === b)); });
  card.querySelectorAll('#mLevel button').forEach(b => b.onclick = () => { settings.level = +b.dataset.v; card.querySelectorAll('#mLevel button').forEach(x => x.classList.toggle('sel', x === b)); });
  card.querySelectorAll('#mCats button').forEach(b => b.onclick = () => {
    const k = b.dataset.v, on = settings.cats.includes(k);
    if (on && settings.cats.length === 1) return;
    settings.cats = on ? settings.cats.filter(x => x !== k) : settings.cats.concat(k);
    b.classList.toggle('sel', !on);
  });
  $('mTimer').onclick = () => { settings.timer = !settings.timer; $('mTimer').classList.toggle('sel', settings.timer); $('mTimer').textContent = `⏳ Timer ${settings.timer ? 'on' : 'off'}`; };
  $('mScores').onclick = () => { close('infoOv'); showScores(); };
}

// ------------------------------------------------------------ wiring
$('bl').onclick = () => turn(-1);
$('br').onclick = () => turn(1);
$('bb').onclick = () => turn(2);
$('bf').onclick = () => tryDoor(1);
$('bs').onclick = () => climb();
$('bm').onclick = () => { if (!busy && !$('qOv').classList.contains('show')) showMenu(); };
document.addEventListener('keydown', e => {
  if (blocked()) return;
  const k = { ArrowLeft: () => turn(-1), ArrowRight: () => turn(1), ArrowDown: () => turn(2), ArrowUp: () => tryDoor(1), Enter: () => climb() }[e.key];
  if (k) { e.preventDefault(); k(); }
});

// Draw a castle behind the menu so the page never looks empty.
const resume = loadJSON(SAVE_KEY, null);
if (resume && !resume.over && resume.v === 2) { S = resume; render(); }
else { newGame(); dropKey(SAVE_KEY); }
showMenu();
window.__coq = { get state() { return S; }, ask, tryDoor, climb, talk };
})();
