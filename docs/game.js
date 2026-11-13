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
  ghost:     { name: 'The Grey Lady', lines: ['Ooooh… I have wandered these halls for centuries.', 'Ooooh… so many questions I never answered…', 'I drift where I please. Perhaps we shall meet again.'] },
  merchant:  { name: 'Fennick the Peddler', lines: ['Keys! Hints! Finest wares this side of the moat!', 'Everything has a price, friend. Even wisdom.', 'Psst. Buying or browsing?'] },
  trickster: { name: 'Quibble the Trickster', lines: ['Heh heh. Fancy a game with real stakes?', 'Everyone loves a shortcut. Few survive mine.', 'I only ask the hard ones. The easy ones bore me.'] },
  sphinx:    { name: 'The Sphinx', lines: ['Mortal. Few pass me with their pride intact.', 'I have asked riddles since before this castle had walls.', 'Think carefully. I can smell a guess.'] }
};
// Residents spread through each floor. The ghost, merchant and sphinx are placed separately.
const REGULARS = ['jester', 'knight', 'wizard', 'monk', 'cook', 'bard', 'lady', 'alchemist', 'parrot', 'owl', 'cat'];
// Residents who have lost something and will reward you for finding it.
const QUESTS = {
  cook:   { item: 'ladle',  name: 'golden ladle',      ask: 'My golden ladle! Some scamp has run off with it. It must be somewhere on this floor. Find it and I shall reward you handsomely.' },
  monk:   { item: 'book',   name: 'book of hours',     ask: 'I set down my book of hours and now it is gone. Could you look for it on this floor? I would be most grateful.' },
  lady:   { item: 'ring',   name: 'sapphire ring',     ask: 'My sapphire ring slipped from my finger while I wandered. It is somewhere on this floor. Would you find it for me?' },
  knight: { item: 'helmet', name: 'plumed helmet',     ask: 'A knight without his helmet! I left it in some room on this floor and cannot recall which. Be a friend and fetch it?' }
};
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
function makeFloor(size, number, entry, last) {
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
  const charCount = Math.round(N * 0.12), cast = shuffle(REGULARS.slice());
  for (let i = 0; i < charCount && pool.length; i++) chars[pool.pop()] = cast[i % cast.length];
  chars[pool.pop()] = 'ghost';
  chars[pool.pop()] = 'merchant';
  // a sphinx on every floor; on the last floor the Great Sphinx guards the stairs instead
  if (last) chars[exit] = 'sphinx'; else chars[pool.pop()] = 'sphinx';
  // a trickster on every floor offers a dangerous shortcut
  chars[pool.pop()] = 'trickster';
  // chests (some bite) and a wishing well, never in a room with someone in it
  const objects = {}, free = pool.filter(c => !chars[c]);
  const chestCount = Math.max(2, Math.round(N * 0.06));
  for (let i = 0; i < chestCount && free.length; i++) objects[free.pop()] = { type: 'chest', mimic: Math.random() < 0.25 };
  if (free.length) objects[free.pop()] = { type: 'well' };
  const paintings = {};
  for (let i = 0; i < N; i++) if (Math.random() < 0.55) paintings[i] = rnd(PAINTINGS);
  // one painting per floor hangs crooked and hides a clue
  const hung = Object.keys(paintings).map(Number).filter(c => c !== exit && c !== entry);
  const clue = hung.length ? hung[rnd(hung.length)] : -1;
  const names = [];
  for (let i = 0; i < N; i++) names.push(`the ${ROOM_ADJ[rnd(ROOM_ADJ.length)]} ${ROOM_NOUN[rnd(ROOM_NOUN.length)]}`);
  return { size, number, last: !!last, theme: THEMES[number % THEMES.length], edges, entry, exit, keys, chars, talked: [], paintings, names, visited: [entry],
           objects, clue, clueFound: false, quests: {}, revealed: false, guardPassed: false };
}

function newGame() {
  const m = MODES[settings.mode];
  S = {
    v: 2, settings: JSON.parse(JSON.stringify(settings)),
    floors: [makeFloor(m.size, 0, randomCorner(m.size), m.floors === 1)], floor: 0, totalFloors: m.floors,
    facing: 0, score: 0, keys: 1, hints: 1, answered: 0, correct: 0, streak: 0, best: 0,
    deck: [], rdeck: [], wager: 0, riddles: 0, over: false, started: Date.now()
  };
  S.pos = F().entry; S.facing = faceInward(S.pos);
  persist(); render();
  say(`You stand in ${F().names[S.pos]}. Find the staircase up; it marks itself ⇧ on your map once you've found it. Talk to the people you meet. Some will help.`);
}

function randomCorner(n) { return [0, n - 1, n * (n - 1), n * n - 1][rnd(4)]; }

function faceInward(c) {
  const n = F().size, x = c % n, y = Math.floor(c / n);
  return y < n / 2 ? 2 : 0;
}

// Older saves predate sphinxes, chests and quests: fill in what is missing.
function normalize(st) {
  const f = st.floors[st.floor];
  for (const [k, v] of Object.entries({ objects: {}, clue: -1, clueFound: false, quests: {}, revealed: false, guardPassed: false, last: false })) if (f[k] === undefined) f[k] = v;
  for (const [k, v] of Object.entries({ rdeck: [], wager: 0, riddles: 0 })) if (st[k] === undefined) st[k] = v;
  if (!f.done && f.chars) {
    const have = new Set(Object.values(f.chars));
    const free = shuffle([...Array(f.size * f.size).keys()].filter(c => c !== f.entry && c !== f.exit && c !== st.pos && !f.chars[c] && !f.objects[c] && !f.keys.includes(c)));
    for (const k of ['trickster', 'merchant', 'sphinx']) if (!have.has(k) && free.length) f.chars[free.pop()] = k;
  }
  return st;
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
// The trickster only asks the hardest questions, drawn fresh each time.
function pickHard(seen) {
  const Q = window.QUESTIONS, cats = new Set(S.settings.cats);
  let pool = Q.filter(q => q[1] === 4 && cats.has(q[0]) && !seen.includes(q[2]));
  if (!pool.length) pool = Q.filter(q => q[1] === 4 && !seen.includes(q[2]));
  return pool[rnd(pool.length)];
}
function pickRiddle() {
  if (!S.rdeck.length) S.rdeck = shuffle([...window.RIDDLES.keys()]);
  return window.RIDDLES[S.rdeck.pop()];
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
    const tilt = c === f.clue && !f.clueFound ? ' transform="rotate(-7 400 147)"' : '';
    svg += `<image class="hot" data-paint="1"${tilt} href="assets/painting_${String(f.paintings[c]).padStart(2, '0')}.png" x="352" y="112" width="96" height="70"/>`;
  }
  svg += doorSvg(0, door(c, L)) + doorSvg(1, door(c, fc)) + doorSvg(2, door(c, R));
  if (c === f.exit) svg += `<image class="hot" data-stairs="1" href="assets/stairs.png" x="196" y="282" width="134" height="124"/>`;
  const ob = f.objects[c];
  if (ob && ob.type === 'chest') svg += `<image class="hot" data-obj="1" href="assets/chest_${!ob.opened ? 'closed' : ob.mimic ? 'mimic' : 'open'}.png" x="196" y="318" width="140" height="112"/>`;
  if (ob && ob.type === 'well') svg += `<image class="hot" data-obj="1" href="assets/well.png" x="186" y="276" width="160" height="160"/>`;
  for (const q of Object.values(f.quests)) if (q.at === c && !q.have) svg += `<image class="hot" data-item="1" href="assets/item_${QUESTS[q.kind].item}.png" x="364" y="404" width="72" height="72"/>`;
  if (f.chars[c]) svg += `<image class="hot" data-char="1" href="assets/char_${f.chars[c]}.png" x="482" y="276" width="126" height="168"/>`;
  $('view').innerHTML = svg;
  $('view').querySelectorAll('[data-obj]').forEach(g => g.addEventListener('click', useObject));
  $('view').querySelectorAll('[data-item]').forEach(g => g.addEventListener('click', () => { pickUp(); render(); }));
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
    const glyph = f.chars[c] === 'sphinx' ? '☥' : f.chars[c] === 'trickster' ? '?' : f.chars[c] ? '☺' : f.objects[c] && f.objects[c].type === 'well' ? '◎' : f.objects[c] && !f.objects[c].opened ? '▣' : '';
    if (v && glyph && c !== S.pos && c !== f.exit) s += `<text x="${pad + x * cs + cs / 2}" y="${pad + y * cs + cs / 2 + 5}" font-size="13" text-anchor="middle" fill="${glyph === '☥' ? '#f6d983' : '#cdb98f'}">${glyph}</text>`;
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
  if (vis.has(f.exit) || f.revealed) {
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
    const ob = f.objects[S.pos];
    if (f.chars[S.pos]) m += ` ${CHARS[f.chars[S.pos]].name} is here.`;
    if (ob && ob.type === 'chest' && !ob.opened) m += ' A treasure chest sits against the wall.';
    if (ob && ob.type === 'well') m += ' A wishing well burbles in the corner.';
    if (Object.values(f.quests).some(q => q.at === S.pos && !q.have)) m += ' Something glints on the floor!';
    if (S.pos === f.exit) m += f.last && !f.guardPassed ? ' A staircase leads up, but the Sphinx guards it.' : ' A staircase leads up!';
    persist(); render(); $('view').classList.remove('fade'); busy = false; say(m);
    checkTrapped();
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

// ------------------------------------------------------------ residents
const lvl = () => S.settings.level;
function award(kind, n) {
  if (kind === 'key') { S.keys += n; return `+${n} key${n > 1 ? 's' : ''}`; }
  if (kind === 'hint') { S.hints += n; return `+${n} hint${n > 1 ? 's' : ''}`; }
  S.score += n; return `+${n} points`;
}
function fine(n) { const t = Math.min(S.score, n); S.score -= t; return t; }
function bearing(from, to) {
  const n = F().size, dx = to % n - from % n, dy = Math.floor(to / n) - Math.floor(from / n);
  const parts = [dy < 0 ? 'north' : dy > 0 ? 'south' : '', dx < 0 ? 'west' : dx > 0 ? 'east' : ''].filter(Boolean);
  return parts.join('-') || 'right here';
}

function talk() {
  if (blocked()) return;
  const f = F(), c = S.pos, kind = f.chars[c], ch = CHARS[kind];
  const tag = kind === 'ghost' ? 'ghost' : kind + '@' + c;
  const head = `<img class="portrait" src="assets/char_${kind}.png" alt=""><h2>${ch.name}</h2>`;
  ACTS[kind]({
    f, c, kind, ch, done: f.talked.includes(tag),
    line: `<p>“${ch.lines[rnd(ch.lines.length)]}”</p>`,
    finish() { if (!f.talked.includes(tag)) f.talked.push(tag); persist(); render(); },
    card(body, btns) { info(head + body + '<div style="clear:both"></div>', btns || [['Farewell', null]]); }
  });
}

// What each resident does when you talk to them. Most help once; the merchant trades for as long as you can pay.
function giftAct(n) {
  if (n.done) return n.card(n.line);
  n.finish();
  const r = Math.random();
  let gift;
  if (n.kind === 'ghost' || r < 0.18) { award('key', 1); gift = `<b>${n.ch.name} gives you a key.</b>`; }
  else if (r < 0.7) { award('hint', 1); gift = `<b>${n.ch.name} whispers a secret: +1 hint.</b> A hint removes two wrong answers.`; }
  else gift = `<b>${n.ch.name} cheers you on: ${award('points', 100 * lvl())}.</b>`;
  persist(); render();
  n.card(`${n.line}<p>${gift}</p>`);
}

function questAct(n) {
  const Q = QUESTS[n.kind], q = n.f.quests[n.c];
  if (!q) return n.card(`<p>“${Q.ask}”</p>`, [['I will look for it', () => {
    const taken = new Set([n.f.entry, n.f.exit, S.pos, ...Object.keys(n.f.chars).map(Number), ...Object.keys(n.f.objects).map(Number), ...Object.values(n.f.quests).map(x => x.at)]);
    const all = [...Array(n.f.size * n.f.size).keys()].filter(i => !taken.has(i));
    const fresh = all.filter(i => !n.f.visited.includes(i));
    const pick = fresh.length ? fresh : all;
    n.f.quests[n.c] = { kind: n.kind, at: pick[rnd(pick.length)], have: false, done: false };
    persist(); render(); say(`You promise to look for the ${Q.name}. It is somewhere on this floor.`);
  }], ['Not now', null]]);
  if (q.done) return n.card(`${n.line}<p>“Thank you again for finding my ${Q.name}!”</p>`);
  if (!q.have) return n.card(`<p>“Any luck finding my ${Q.name}? It is somewhere on this floor, I am sure of it.”</p>`);
  q.done = true;
  const got = [award('key', 1), award('points', 250 * lvl())].join(', ');
  n.finish();
  n.card(`<p>“My ${Q.name}! You found it! Here, take this for your trouble.”</p><p><b>${got}.</b></p>`);
}

const CUPS = `<svg viewBox="0 0 300 90" style="display:block;width:100%;max-width:300px;margin:8px auto">${[50, 150, 250].map((x, i) =>
  `<path d="M${x - 34},80 L${x - 24},14 Q${x},4 ${x + 24},14 L${x + 34},80 Z" fill="#7a3a8c" stroke="#e3b54a" stroke-width="3"/><text x="${x}" y="58" text-anchor="middle" font-size="22" fill="#f6d983" font-family="Georgia">${'ABC'[i]}</text>`).join('')}</svg>`;

const ACTS = {
  parrot: giftAct, cat: giftAct, ghost: giftAct,
  cook: questAct, monk: questAct, lady: questAct, knight: questAct,

  jester(n) {
    if (n.done) return n.card(`${n.line}<p>“You've had your go! My peas need a rest.”</p>`);
    const play = i => {
      n.finish();
      const prize = rnd(3), crumb = (prize + 1 + rnd(2)) % 3;
      const what = ['key', 'hint', 'hint', 'points'][rnd(4)];
      let res;
      if (i === prize) res = `<b>The pea! You win: ${what === 'points' ? award('points', 200 * lvl()) : award(what, 1)}.</b>`;
      else if (i === crumb) res = `Only a crumb of cheese. Pip gives you a pity prize: <b>${award('points', 25 * lvl())}</b>. The pea was under cup ${'ABC'[prize]}.`;
      else res = `Empty! A toad hops out and croaks at you. The pea was under cup ${'ABC'[prize]}.`;
      persist(); render();
      n.card(`<p>You lift cup ${'ABC'[i]}…</p><p>${res}</p>`);
    };
    n.card(`<p>“A game! A game! I hide a pea under one cup, shuffle-shuffle-shuffle… Pick the right cup and win a prize!”</p>${CUPS}`,
      [['A', () => play(0)], ['B', () => play(1)], ['C', () => play(2)], ['No thanks', null]]);
  },

  wizard(n) {
    if (n.done) return n.card(`${n.line}<p>“The rune will fade when you leave this floor. Use it well.”</p>`);
    n.f.revealed = true; n.finish();
    n.card(`<p>Magister Orrin traces a glowing rune in the air. The walls seem to turn to glass for an instant.</p><p><b>The staircase is now marked ⇧ on your map.</b> It lies to the ${bearing(n.c, n.f.exit)}.</p>`);
  },

  owl(n) {
    if (n.done) return n.card(n.line);
    n.card(`<p>“Whoo! A scholar! Answer one question for me. Get it right and I shall teach you a trick. Get it wrong and… well, no harm done.”</p>`, [['Ask away', () => {
      const [cat, ql, text, answer, ...wrong] = pickQuestion();
      quiz({ head: window.CATEGORIES[cat], sub: 'Professor Hoot asks', text, answer, wrong, timed: false, hint: false, onAnswer(ok) {
        n.finish();
        return ok ? [`<span style="color:var(--green)">“Splendid!”</span> ${award('hint', 1)}, ${award('points', 50 * lvl())}.`]
                  : [`<span style="color:var(--red)">“Hoo, not quite.”</span> The answer was <b>${answer}</b>. The owl ruffles its feathers kindly.`];
      } });
    }], ['Maybe later', null]]);
  },

  bard(n) {
    if (S.wager) return n.card(`<p>“Our wager stands! The next door decides it. I've already rhymed both endings.”</p>`);
    if (n.done) return n.card(n.line);
    const bet = 150 * lvl();
    n.card(`<p>“A wager for my ballad! I bet <b>${bet} points</b> that you get the <i>next</i> door wrong. Answer it right and I pay you. Get it wrong and you pay me.”</p>`,
      [['Take the bet', () => { S.wager = bet; n.finish(); say(`You shake hands with Wren. ${bet} points ride on your next door.`); }], ['Decline', null]]);
  },

  alchemist(n) {
    if (n.done) return n.card(`${n.line}<p>“One potion per customer. Doctor's orders. I am the doctor.”</p>`);
    n.card(`<p>Old Varro holds out a fizzing green flask. “My latest brew! Probably safe. Care to try it?”</p>`, [['Drink it', () => {
      n.finish();
      const r = Math.random();
      const res = r < 0.35 ? `Your mind feels razor sharp. <b>${award('hint', 2)}.</b>`
        : r < 0.55 ? `You hiccup, and a brass key pops out of your mouth! <b>${award('key', 1)}.</b>`
        : r < 0.8 ? `Your purse feels heavier. <b>${award('points', 150 * lvl())}.</b>`
        : 'You turn faintly green, burp a bubble, and feel… exactly the same. “Hmm. Back to the cauldron.”';
      persist(); render();
      n.card(`<p>${res}</p>`);
    }], ['No thank you', null]]);
  },

  merchant(n) {
    const kp = 250 * lvl(), hp = 120 * lvl(), btns = [];
    if (S.score >= kp) btns.push([`Key (−${kp})`, () => { S.score -= kp; S.keys++; persist(); render(); say('Fennick hands you a brass key. “Pleasure doing business!”'); }]);
    if (S.score >= hp) btns.push([`Hint (−${hp})`, () => { S.score -= hp; S.hints++; persist(); render(); say('Fennick whispers a trade secret: +1 hint.'); }]);
    btns.push(['Just looking', null]);
    n.card(`${n.line}<p>For sale: a key for <b>${kp}</b> points, a hint for <b>${hp}</b> points.</p>${btns.length === 1 ? '<p class="small">You cannot afford anything yet.</p>' : ''}`, btns);
  },

  trickster(n) {
    if (n.done) return n.card(`${n.line}<p>“You've had your game. Off you go, before I change my mind.”</p>`);
    const prize = 1000 * lvl(), up = !n.f.last;
    n.card(`<p>Quibble flips a coin that never seems to land.</p><p>“A game! Three questions, the <b>hardest</b> in the castle. No hints. Get all three and I'll give you ${prize} points and a key${up ? ', and whisk you straight up to the next floor' : ''}.”</p><p>“Miss even one, and… <b>poof!</b> ${S.floor ? 'Back to the very first floor you go' : 'I scramble this whole floor and drop you at the start of it'}. Fresh castle, same score. Heh heh.”</p>`,
      [['Play', () => trick(n, 1)], ['No way', null]]);
  },

  sphinx(n) {
    const guard = n.f.last && n.c === n.f.exit;
    if (guard && n.f.guardPassed) return n.card(`<p>“You have answered well. The throne awaits, champion.”</p>`, [['Climb to the throne', climb], ['Not yet', null]]);
    if (!guard && n.done) return n.card(`${n.line}<p>“One riddle per traveler. Go.”</p>`);
    const intro = guard
      ? `<p>The Great Sphinx lies across the foot of the stairs, tail twitching.</p><p>“None reach the throne without answering me. Fail and I take a toll, but you may ask again.”</p>`
      : `<p>“Answer my riddle, and I will reward you richly. Fail, and I take something of yours.”</p>`;
    n.card(intro, [['Hear the riddle', () => {
      const [text, answer, ...wrong] = pickRiddle();
      quiz({ head: guard ? 'The Great Sphinx' : 'Riddle of the Sphinx', sub: 'Riddle', text, answer, wrong, timed: false, onAnswer(ok) {
        if (ok) S.riddles++;
        if (guard) {
          if (ok) { n.f.guardPassed = true; return [`<span style="color:var(--green)">“Correct.”</span> The Sphinx rises and steps aside. ${award('points', 500 * lvl())}`, () => say('The way to the throne is open. Climb the stairs!')]; }
          const t = fine(150 * lvl());
          return [`<span style="color:var(--red)">“Wrong.”</span> The answer was <b>${answer}</b>. The Sphinx takes a toll of ${t} points. “Return when you are ready.”`];
        }
        n.finish();
        if (ok) return [`<span style="color:var(--green)">“Well reasoned, mortal.”</span> ${[award('key', 1), award('hint', 1), award('points', 250 * lvl())].join(', ')}.`];
        const took = S.hints > 0 ? (S.hints--, 'one of your hints') : `${fine(100 * lvl())} points`;
        return [`<span style="color:var(--red)">“Wrong.”</span> The answer was <b>${answer}</b>. The Sphinx takes ${took} and looks smug.`];
      } });
    }], [guard ? 'Not yet' : 'Back away', null]]);
  }
};

function trick(n, round, seen = []) {
  const [cat, ql, text, answer, ...wrong] = pickHard(seen);
  seen.push(text);
  quiz({ head: window.CATEGORIES[cat], sub: `Trickster · ${round} of 3`, text, answer, wrong, timed: true, hint: false, onAnswer(ok, picked) {
    S.answered++;
    if (!ok) {
      n.finish();
      return [`<span style="color:var(--red)">${picked === null ? 'Too slow!' : '“Wrong!”'}</span> The answer was <b>${answer}</b>. Quibble snaps his fingers…`, sendBack];
    }
    S.correct++;
    if (round < 3) return [`<span style="color:var(--green)">“Lucky guess.”</span> Two-thirds of the way to glory. ${3 - round} to go.`, () => trick(n, round + 1, seen)];
    n.finish();
    const got = [award('points', 1000 * lvl()), award('key', 1)].join(', ');
    if (n.f.last) return [`<span style="color:var(--green)">“Bah! All three!”</span> ${got}.`];
    return [`<span style="color:var(--green)">“Bah! All three!”</span> ${got}. Quibble snaps his fingers and the floor drops away beneath you…`, () => ascend('The trickster whisks you up a whole floor!')];
  } });
}

// The trickster's punishment: a brand-new castle from floor 1, keeping score, keys and hints.
function sendBack() {
  const n = F().size;
  busy = true; $('view').classList.add('fade');
  setTimeout(() => {
    S.floors = [makeFloor(n, 0, randomCorner(n), S.totalFloors === 1)];
    S.floor = 0; S.pos = F().entry; S.facing = faceInward(S.pos);
    persist(); render(); $('view').classList.remove('fade'); busy = false;
    say(`POOF! You tumble through a trapdoor and land back on floor 1 of ${S.totalFloors}. The castle has rearranged itself. Your score, keys and hints are still yours.`);
  }, 350);
}

function pickUp() {
  if (blocked()) return;
  const f = F();
  for (const q of Object.values(f.quests)) if (q.at === S.pos && !q.have) {
    q.have = true; S.score += 50;
    persist(); render();
    say(`You pick up ${CHARS[q.kind].name}'s ${QUESTS[q.kind].name}. (+50) Take it back to them!`);
  }
}

// ------------------------------------------------------------ objects
function useObject() {
  if (blocked()) return;
  const ob = F().objects[S.pos];
  if (ob.type === 'well') return wishingWell(ob);
  if (ob.opened) return say(ob.mimic ? 'The mimic snores contentedly. It has nothing more to give.' : 'The chest is empty.');
  info(`<img class="wide" style="max-width:200px;margin:0 auto" src="assets/chest_closed.png" alt=""><h2 style="margin-top:10px">A treasure chest</h2><p>Iron-bound and heavy. Most chests in this castle hold treasure. A few hold teeth.</p>`,
    [['Open it', () => openChest(ob)], ['Leave it', null]]);
}

function openChest(ob) {
  ob.opened = true;
  if (!ob.mimic) {
    const r = Math.random();
    const got = r < 0.2 ? award('key', 1) : r < 0.55 ? award('hint', 1) : award('points', (100 + 50 * rnd(4)) * lvl());
    persist(); render();
    return info(`<img class="wide" style="max-width:200px;margin:0 auto" src="assets/chest_open.png" alt=""><h2 style="margin-top:10px">Treasure!</h2><p><b>${got}.</b></p>`, [['Splendid', null]]);
  }
  persist(); render();
  info(`<img class="wide" style="max-width:200px;margin:0 auto" src="assets/chest_mimic.png" alt=""><h2 style="margin-top:10px">It's a mimic!</h2><p>The lid snaps open to reveal rows of teeth. “QUESTION!” it gurgles. “ANSWER OR BE NIBBLED!”</p>`, [['Face it', () => {
    const [cat, ql, text, answer, ...wrong] = pickQuestion();
    quiz({ head: window.CATEGORIES[cat], sub: 'The mimic asks', text, answer, wrong, timed: true, onAnswer(ok) {
      S.answered++;
      if (ok) { S.correct++; return [`<span style="color:var(--green)">The mimic whimpers and coughs up its hoard.</span> ${award('key', 1)}, ${award('points', 150 * lvl())}.`]; }
      return [`<span style="color:var(--red)">CHOMP!</span> The answer was <b>${answer}</b>. The mimic nibbles your purse: −${fine(100 * lvl())} points.`];
    } });
  }]]);
}

function wishingWell(ob) {
  const cost = 50 * lvl(), left = 5 - (ob.tosses || 0);
  const pic = `<img class="wide" style="max-width:180px;margin:0 auto" src="assets/well.png" alt=""><h2 style="margin-top:10px">The wishing well</h2>`;
  if (left <= 0) return info(`${pic}<p>You lean over the edge. The well is dry now, and your wishes echo back unanswered.</p>`, [['Back', null]]);
  if (S.score < cost) return info(`${pic}<p>A coin costs ${cost} points to toss, and your purse is too light.</p>`, [['Back', null]]);
  info(`${pic}<p>Toss a coin and make a wish? It costs <b>${cost}</b> points. The well has ${left} wish${left > 1 ? 'es' : ''} left in it.</p>`, [['Toss a coin', () => {
    S.score -= cost; ob.tosses = (ob.tosses || 0) + 1;
    const r = Math.random();
    const res = r < 0.08 ? `A key floats up on a lily pad! <b>${award('key', 1)}.</b>`
      : r < 0.24 ? `A voice burbles up from the depths with advice. <b>${award('hint', 1)}.</b>`
      : r < 0.46 ? `Coins come splashing back up! <b>${award('points', cost * 3)}.</b>`
      : '<i>Plink.</i> Nothing happens. Perhaps the wish is saving itself for later.';
    persist(); render();
    info(`${pic}<p>${res}</p>`, [['Again', () => wishingWell(ob)], ['Walk away', null]]);
  }], ['Walk away', null]]);
}

function viewPainting() {
  if (blocked()) return;
  const f = F(), i = f.paintings[S.pos], kind = PAINT_KIND[i % PAINT_KIND.length];
  const title = PAINT_TITLES[kind][Math.floor(i / PAINT_KIND.length) % 4];
  const painter = PAINTERS[i % PAINTERS.length];
  let secret = '';
  if (S.pos === f.clue && !f.clueFound) {
    f.clueFound = true;
    secret = `<p>The painting hangs crooked. When you straighten it, something rattles behind the frame. Scratched into the stone are the words <i>“The stair lies ${bearing(S.pos, f.exit)}.”</i> A few coins are tucked into the crack. <b>${award('points', 100 * lvl())}.</b></p>`;
    persist(); render();
  }
  info(`<img class="wide" src="assets/painting_${String(i).padStart(2, '0')}.png" alt=""><h2 style="margin-top:10px">${title}</h2><p class="small">${painter}. Oil on panel, from the castle collection.</p>${secret}`, [['Back', null]]);
}

function climb() {
  if (blocked() || S.pos !== F().exit) return;
  if (F().last && !F().guardPassed) return talk();
  const bonus = 300 * S.settings.level;
  S.score += bonus;
  if (S.floor + 1 >= S.totalFloors) return win(bonus);
  ascend(`You climb to floor ${S.floor + 2} of ${S.totalFloors}. (+${bonus}) The rooms here look different…`);
}

function ascend(msg) {
  busy = true; $('view').classList.add('fade');
  setTimeout(() => {
    const prevExit = F().exit, n = F().size;
    S.floors.push(makeFloor(n, S.floor + 1, prevExit, S.floor + 2 >= S.totalFloors));
    S.floors[S.floor] = { size: n, number: S.floor, done: true };   // drop old floor detail to keep saves small
    S.floor++;
    S.pos = F().entry; S.facing = faceInward(S.pos);
    persist(); render(); $('view').classList.remove('fade'); busy = false;
    say(`${msg}${F().last ? ' This is the top floor. Somewhere a great beast is waiting.' : ''}`);
  }, 250);
}

// ------------------------------------------------------------ question dialog
// Shared by doors, riddles, mimics and the owl. onAnswer(correct, picked) returns [verdict html, after-continue fn].
function quiz(o) {
  const { answer } = o;
  const order = shuffle([answer, ...o.wrong]);
  $('qCat').textContent = o.head;
  $('qLvl').textContent = o.sub || '';
  $('qText').textContent = o.text;
  $('qVerdict').textContent = '';
  $('qOk').hidden = true;
  const hb = $('qHint'); hb.hidden = o.hint === false; hb.disabled = S.hints < 1; hb.textContent = `Use a hint (${S.hints})`;
  const box = $('qOpts'); box.innerHTML = '';
  let done = false;
  const finish = (picked) => {
    if (done) return; done = true;
    clearInterval(timerId);
    hb.hidden = true;
    [...box.children].forEach(b => { b.disabled = true; if (b.textContent === answer) b.classList.add('right'); if (picked !== answer && b.textContent === picked) b.classList.add('wrong'); });
    const [html, next] = o.onAnswer(picked === answer, picked);
    $('qVerdict').innerHTML = html;
    $('qOk').onclick = () => { close('qOv'); persist(); render(); if (next) next(); else checkTrapped(); };
    $('qOk').hidden = false; persist();
  };
  order.forEach(t => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => finish(t); box.appendChild(b); });
  hb.onclick = () => {
    if (S.hints < 1 || done) return;
    S.hints--; hb.disabled = true; hb.textContent = `Use a hint (${S.hints})`;
    shuffle([...box.children].filter(b => b.textContent !== answer)).slice(0, 2).forEach(b => { b.classList.add('gone'); b.disabled = true; });
    $('hints').textContent = S.hints;
  };
  const total = o.timed && S.settings.timer ? TIMER[S.settings.level] : 0;
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

function ask(d) {
  const [cat, ql, text, answer, ...wrong] = pickQuestion();
  quiz({ head: window.CATEGORIES[cat], sub: LEVELS[ql], text, answer, wrong, timed: true, onAnswer(ok, picked) {
    S.answered++;
    let bet = '';
    if (S.wager) {
      const w = S.wager; S.wager = 0;
      bet = ok ? ` Wren grumbles and pays the wager: ${award('points', w)}.` : ` You lose the bard's wager: −${fine(w)}.`;
    }
    if (ok) {
      S.correct++; S.streak++; S.best = Math.max(S.best, S.streak);
      const L = S.settings.level, pts = 100 * L + 20 * L * Math.min(S.streak - 1, 5);
      S.score += pts; setDoor(S.pos, d, OPEN);
      return [`<span style="color:var(--green)">Correct! The door swings open.</span> +${pts}${S.streak > 1 ? ` · streak ${S.streak}` : ''}${bet}`, () => walk(d)];
    }
    S.streak = 0; setDoor(S.pos, d, LOCKED);
    return [`<span style="color:var(--red)">${picked === null ? 'Time is up!' : 'Wrong.'}</span> The answer was <b>${answer}</b>. The door slams and locks.${bet}`,
      () => { say('That door is barred now. Find another way, or a key.'); checkTrapped(); }];
  } });
}

// ------------------------------------------------------------ win / lose
function reachable() {
  const seen = new Set([S.pos]), q = [S.pos];
  while (q.length) { const c = q.shift(); for (let d = 0; d < 4; d++) { const st = door(c, d); if (st === CLOSED || st === OPEN) { const n = neighbor(c, d); if (!seen.has(n)) { seen.add(n); q.push(n); } } } }
  return seen;
}
function checkTrapped() {
  if (blocked() || S.over) return;
  const f = F(), r = reachable();
  if (r.has(f.exit) || S.keys > 0) return;
  if (f.keys.some(k => r.has(k))) return;
  const helps = k => {
    const kind = f.chars[k];
    if (kind === 'merchant') return S.score >= 250 * lvl();
    if (kind === 'sphinx' && +k === f.exit || kind === 'trickster') return false;
    if (QUESTS[kind]) { const q = f.quests[k]; return !q || !q.done && (q.have || r.has(q.at)); }
    return !f.talked.includes(kind === 'ghost' ? 'ghost' : kind + '@' + k);
  };
  if (Object.keys(f.chars).some(k => r.has(+k) && helps(k))) return;
  if (Object.keys(f.objects).some(k => r.has(+k) && (f.objects[k].type === 'chest' ? !f.objects[k].opened : (f.objects[k].tosses || 0) < 5 && S.score >= 50 * lvl()))) return;
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
  if (saved && !saved.over) btns.push([`Continue (floor ${saved.floor + 1}, ${saved.score} pts)`, () => { S = normalize(saved); render(); say('Welcome back. The castle remembers you.'); }]);
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
if (resume && !resume.over && resume.v === 2) { S = normalize(resume); render(); }
else { newGame(); dropKey(SAVE_KEY); }
showMenu();
window.__coq = { get state() { return S; }, ask, tryDoor, climb, talk, useObject, viewPainting, pickUp };
})();
