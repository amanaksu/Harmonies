// 풍경 쌓기 — 게임 규칙 엔진 (화면과 분리된 순수 로직)

// 토큰 종류
export const TOKENS = {
  B: { name: '물', count: 23 },
  S: { name: '바위', count: 23 },
  N: { name: '줄기', count: 21 },
  G: { name: '잎', count: 19 },
  Y: { name: '들판', count: 19 },
  R: { name: '지붕', count: 15 },
};
export const TOKEN_KEYS = Object.keys(TOKENS);
export const CENTER_SPACES = 5;
export const RIVER_SIZE = 5;
export const HAND_LIMIT = 4;

// ---------- 육각 보드 ----------
// 평평한 윗변(flat-top) 육각형, 축 좌표(q, r). 열마다 5·4·5·4·5칸 = 23칸.
export const COLUMN_HEIGHTS = [5, 4, 5, 4, 5];
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

export const CELLS = [];
COLUMN_HEIGHTS.forEach((h, col) => {
  for (let row = 0; row < h; row++) {
    const q = col;
    const r = row - (col - (col & 1)) / 2;
    CELLS.push({ q, r, col, row });
  }
});
const keyOf = (q, r) => `${q},${r}`;
export const CELL_INDEX = new Map(CELLS.map((c, i) => [keyOf(c.q, c.r), i]));
export const cellAt = (q, r) => CELL_INDEX.get(keyOf(q, r));
export const NEIGHBORS = CELLS.map((c) =>
  DIRS.map(([dq, dr]) => cellAt(c.q + dq, c.r + dr)).filter((i) => i !== undefined));

// ---------- 동물 카드 ----------
// 패턴: [dq, dr, 맨 위 토큰, 높이]. 첫 칸이 큐브(동물)를 올리는 자리.
// points[k] = 큐브를 k+1개 올렸을 때의 점수.
export const ANIMALS = [
  { id: 'frog', name: '개구리', emoji: '🐸', pattern: [[0, 0, 'B', 1], [0, 1, 'G', 1]], points: [2, 5, 9] },
  { id: 'otter', name: '수달', emoji: '🦦', pattern: [[0, 0, 'B', 1], [0, 1, 'B', 1], [1, -1, 'G', 2]], points: [4, 9, 15] },
  { id: 'duck', name: '오리', emoji: '🦆', pattern: [[0, 0, 'B', 1], [1, 0, 'Y', 1]], points: [2, 4, 7, 11] },
  { id: 'beaver', name: '비버', emoji: '🦫', pattern: [[0, 0, 'B', 1], [0, -1, 'G', 2], [0, 1, 'G', 2]], points: [5, 11, 18] },
  { id: 'swan', name: '백조', emoji: '🦢', pattern: [[0, 0, 'B', 1], [0, 1, 'B', 1], [0, 2, 'B', 1]], points: [4, 9, 15] },
  { id: 'turtle', name: '거북', emoji: '🐢', pattern: [[0, 0, 'B', 1], [-1, 0, 'S', 1], [1, 0, 'Y', 1]], points: [4, 9, 15] },
  { id: 'rabbit', name: '토끼', emoji: '🐇', pattern: [[0, 0, 'Y', 1], [0, 1, 'Y', 1]], points: [2, 4, 7, 11] },
  { id: 'deer', name: '사슴', emoji: '🦌', pattern: [[0, 0, 'Y', 1], [1, -1, 'G', 3]], points: [4, 9, 15] },
  { id: 'fox', name: '여우', emoji: '🦊', pattern: [[0, 0, 'Y', 1], [0, 1, 'R', 2]], points: [3, 7, 12] },
  { id: 'hedgehog', name: '고슴도치', emoji: '🦔', pattern: [[0, 0, 'G', 1], [0, 1, 'G', 1], [1, -1, 'Y', 1]], points: [3, 7, 12] },
  { id: 'squirrel', name: '다람쥐', emoji: '🐿️', pattern: [[0, 0, 'G', 2], [0, 1, 'G', 1]], points: [3, 6, 10, 15] },
  { id: 'owl', name: '부엉이', emoji: '🦉', pattern: [[0, 0, 'G', 3], [1, 0, 'G', 2]], points: [5, 11, 18] },
  { id: 'bear', name: '곰', emoji: '🐻', pattern: [[0, 0, 'G', 3], [0, 1, 'S', 2], [0, -1, 'B', 1]], points: [6, 13, 21] },
  { id: 'eagle', name: '독수리', emoji: '🦅', pattern: [[0, 0, 'S', 3], [0, 1, 'S', 2]], points: [5, 11, 18] },
  { id: 'goat', name: '산양', emoji: '🐐', pattern: [[0, 0, 'S', 2], [-1, 1, 'S', 1], [1, 0, 'Y', 1]], points: [4, 9, 15] },
  { id: 'badger', name: '오소리', emoji: '🦡', pattern: [[0, 0, 'S', 1], [0, 1, 'Y', 1]], points: [2, 5, 9, 14] },
  { id: 'cat', name: '고양이', emoji: '🐈', pattern: [[0, 0, 'R', 2], [0, 1, 'Y', 1]], points: [3, 7, 12] },
  { id: 'mouse', name: '생쥐', emoji: '🐁', pattern: [[0, 0, 'R', 2], [1, -1, 'G', 1], [-1, 1, 'Y', 1]], points: [4, 9, 15] },
  { id: 'bat', name: '박쥐', emoji: '🦇', pattern: [[0, 0, 'S', 2], [0, 1, 'R', 2]], points: [4, 9, 15] },
  { id: 'butterfly', name: '나비', emoji: '🦋', pattern: [[0, 0, 'Y', 1], [0, -1, 'G', 1], [0, 1, 'R', 2]], points: [4, 9, 15] },
  { id: 'wolf', name: '늑대', emoji: '🐺', pattern: [[0, 0, 'S', 1], [0, -1, 'G', 3], [0, 1, 'G', 2]], points: [6, 13, 21] },
  { id: 'raccoon', name: '너구리', emoji: '🦝', pattern: [[0, 0, 'R', 2], [0, 1, 'B', 1]], points: [3, 7, 12] },
  { id: 'snail', name: '달팽이', emoji: '🐌', pattern: [[0, 0, 'G', 1], [0, 1, 'B', 1]], points: [2, 5, 9, 14] },
  { id: 'bee', name: '꿀벌', emoji: '🐝', pattern: [[0, 0, 'Y', 1], [1, -1, 'Y', 1], [1, 0, 'G', 1]], points: [3, 7, 12] },
  { id: 'sparrow', name: '참새', emoji: '🐦', pattern: [[0, 0, 'R', 2], [0, 1, 'R', 2]], points: [4, 9, 15] },
  { id: 'leopard', name: '표범', emoji: '🐆', pattern: [[0, 0, 'S', 3], [1, 0, 'G', 2], [-1, 1, 'Y', 1]], points: [6, 13, 21] },
];
export const ANIMAL_BY_ID = Object.fromEntries(ANIMALS.map((a) => [a.id, a]));

// 60도 회전 (축 좌표)
const rot = ([q, r]) => [-r, q + r];
export function rotations(pattern) {
  const out = [];
  let cur = pattern.map(([q, r, t, h]) => [q, r, t, h]);
  for (let k = 0; k < 6; k++) {
    out.push(cur);
    cur = cur.map(([q, r, t, h]) => { const [a, b] = rot([q, r]); return [a, b, t, h]; });
  }
  return out;
}
const ROT_CACHE = new Map(ANIMALS.map((a) => [a.id, rotations(a.pattern)]));

// ---------- 쌓기 규칙 ----------
export const top = (stack) => stack[stack.length - 1];

export function canStack(cell, tok) {
  if (cell.cube) return false;
  const st = cell.stack;
  const h = st.length;
  if (h === 0) return true;
  const t = top(st);
  switch (tok) {
    case 'B': case 'Y': return false;
    case 'S': return h < 3 && st.every((x) => x === 'S');
    case 'N': return h === 1 && t === 'N';
    case 'G': return h <= 2 && st.every((x) => x === 'N');
    case 'R': return h === 1 && (t === 'S' || t === 'N' || t === 'R');
    default: return false;
  }
}

// ---------- 유틸 ----------
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- 게임 ----------
export function newGame(names, rng = Math.random) {
  const n = names.length;
  if (n < 2 || n > 4) throw new Error('2~4명만 가능합니다');
  const bag = [];
  for (const k of TOKEN_KEYS) for (let i = 0; i < TOKENS[k].count; i++) bag.push(k);
  shuffle(bag, rng);
  const deck = shuffle(ANIMALS.map((a) => a.id), rng);
  const s = {
    players: names.map((name) => ({
      name,
      board: CELLS.map(() => ({ stack: [], cube: null })),
      cards: [], // { id, placed, done }
    })),
    bag,
    discard: [],
    center: Array.from({ length: CENTER_SPACES }, () => bag.splice(-3, 3)),
    deck,
    river: [],
    current: 0,
    turnNo: 1,
    endTriggered: null, // { by, reason }
    phase: 'play', // 'play' | 'over'
    turn: null,
    final: null,
  };
  while (s.river.length < RIVER_SIZE && s.deck.length) s.river.push(s.deck.pop());
  beginTurn(s);
  return s;
}

function beginTurn(s) {
  s.turn = { tray: [], took: null, tookCard: false, cubesThisTurn: 0 };
}

export const curPlayer = (s) => s.players[s.current];
export const openCards = (p) => p.cards.filter((c) => !c.done);

export function takeTokens(s, space) {
  if (s.phase !== 'play') throw new Error('게임이 끝났습니다');
  if (s.turn.took !== null) throw new Error('이번 차례에는 이미 토큰을 가져왔어요');
  const toks = s.center[space];
  if (!toks || toks.length === 0) throw new Error('빈 칸입니다');
  s.turn.tray = toks.slice();
  s.center[space] = [];
  s.turn.took = space;
}

export function legalCellsForToken(s, tok, p = curPlayer(s)) {
  const out = [];
  p.board.forEach((cell, i) => { if (canStack(cell, tok)) out.push(i); });
  return out;
}

export function placeToken(s, trayIndex, cellIdx) {
  const tok = s.turn.tray[trayIndex];
  if (tok === undefined) throw new Error('그 토큰이 없습니다');
  const cell = curPlayer(s).board[cellIdx];
  if (!cell || !canStack(cell, tok)) throw new Error('거기에는 놓을 수 없어요');
  cell.stack.push(tok);
  s.turn.tray.splice(trayIndex, 1);
}

export function canTakeCard(s) {
  return s.phase === 'play' && !s.turn.tookCard && openCards(curPlayer(s)).length < HAND_LIMIT;
}

export function takeCard(s, riverIndex) {
  if (!canTakeCard(s)) throw new Error('지금은 카드를 가져올 수 없어요');
  const id = s.river[riverIndex];
  if (!id) throw new Error('그 카드가 없습니다');
  s.river.splice(riverIndex, 1);
  curPlayer(s).cards.push({ id, placed: 0, done: false });
  s.turn.tookCard = true;
  if (s.deck.length) s.river.push(s.deck.pop());
}

// 카드의 패턴이 맞는 큐브 자리 목록
export function cubeSpots(board, animalId) {
  const out = [];
  const rots = ROT_CACHE.get(animalId);
  CELLS.forEach((c, i) => {
    if (board[i].cube) return;
    const ok = rots.some((pat) => pat.every(([dq, dr, t, h]) => {
      const j = cellAt(c.q + dq, c.r + dr);
      if (j === undefined) return false;
      const st = board[j].stack;
      return st.length === h && top(st) === t;
    }));
    if (ok) out.push(i);
  });
  return out;
}

export function placeCube(s, cardIndex, cellIdx) {
  const p = curPlayer(s);
  const card = p.cards[cardIndex];
  if (!card || card.done) throw new Error('그 카드에는 큐브를 놓을 수 없어요');
  if (!cubeSpots(p.board, card.id).includes(cellIdx)) throw new Error('패턴이 맞지 않아요');
  p.board[cellIdx].cube = card.id;
  card.placed++;
  s.turn.cubesThisTurn++;
  const a = ANIMAL_BY_ID[card.id];
  if (card.placed >= a.points.length) card.done = true;
  return card;
}

// 남은 토큰이 어디에도 놓일 수 없으면 버릴 수 있다
export function stuckTokens(s) {
  return s.turn.tray.filter((t) => legalCellsForToken(s, t).length === 0);
}

export function canEndTurn(s) {
  if (s.phase !== 'play' || s.turn.took === null) return false;
  return s.turn.tray.every((t) => legalCellsForToken(s, t).length === 0);
}

export function endTurn(s) {
  if (!canEndTurn(s)) throw new Error('가져온 토큰을 모두 놓아야 차례를 마칠 수 있어요');
  s.discard.push(...s.turn.tray);
  s.turn.tray = [];
  const p = curPlayer(s);

  // 중앙 칸 채우기
  if (s.bag.length >= 3) s.center[s.turn.took] = s.bag.splice(-3, 3);
  else if (!s.endTriggered) s.endTriggered = { by: s.current, reason: 'bag' };

  const empty = p.board.filter((c) => c.stack.length === 0).length;
  if (empty <= 2 && !s.endTriggered) s.endTriggered = { by: s.current, reason: 'board' };

  const next = (s.current + 1) % s.players.length;
  // 모두 같은 횟수를 하도록, 시작 플레이어 차례가 다시 오면 끝
  if (s.endTriggered && next === 0) {
    finish(s);
    return;
  }
  // 중앙에 가져갈 토큰이 하나도 없으면 바로 끝
  if (s.center.every((c) => c.length === 0)) {
    if (!s.endTriggered) s.endTriggered = { by: s.current, reason: 'bag' };
    finish(s);
    return;
  }
  s.current = next;
  if (next === 0) s.turnNo++;
  beginTurn(s);
}

// ---------- 점수 ----------
const TREE = { 1: 1, 2: 3, 3: 7 };
const MOUNTAIN = { 1: 1, 2: 3, 3: 7 };
export function riverPoints(len) {
  const table = [0, 0, 2, 5, 8, 11, 15];
  if (len < table.length) return table[len];
  return 15 + (len - 6) * 4;
}

const PATH_CACHE = new Map();
function longestPath(cells) {
  const key = cells.join(',');
  if (PATH_CACHE.has(key)) return PATH_CACHE.get(key);
  const set = new Set(cells);
  let best = 0;
  const seen = new Set();
  // seen을 피해 x에서 닿을 수 있는 칸 수 (가지치기용 상한)
  const reach = (x) => {
    const vis = new Set([x]); const st = [x];
    while (st.length) {
      const a = st.pop();
      for (const b of NEIGHBORS[a]) if (set.has(b) && !seen.has(b) && !vis.has(b)) { vis.add(b); st.push(b); }
    }
    return vis.size;
  };
  const dfs = (x, len) => {
    if (len > best) best = len;
    if (len + reach(x) - 1 <= best) return;
    for (const y of NEIGHBORS[x]) {
      if (set.has(y) && !seen.has(y)) {
        seen.add(y); dfs(y, len + 1); seen.delete(y);
      }
    }
  };
  // 이웃이 적은 칸(끝점 후보)부터 시작하면 좋은 답을 빨리 찾는다
  const order = [...cells].sort((a, b) =>
    NEIGHBORS[a].filter((y) => set.has(y)).length - NEIGHBORS[b].filter((y) => set.has(y)).length);
  for (const start of order) {
    seen.clear(); seen.add(start); dfs(start, 1);
    if (best === cells.length) break;
  }
  if (PATH_CACHE.size > 500) PATH_CACHE.clear();
  PATH_CACHE.set(key, best);
  return best;
}

export function scoreBoard(p) {
  const b = p.board;
  const tops = b.map((c) => (c.stack.length ? top(c.stack) : null));
  const res = { trees: 0, mountains: 0, fields: 0, buildings: 0, water: 0, animals: 0, riverLen: 0 };

  b.forEach((c, i) => {
    const h = c.stack.length;
    if (!h) return;
    const t = tops[i];
    if (t === 'G') res.trees += TREE[h];
    if (t === 'S' && NEIGHBORS[i].some((j) => tops[j] === 'S')) res.mountains += MOUNTAIN[h];
    if (t === 'R' && h === 2) {
      const colors = new Set(NEIGHBORS[i].map((j) => tops[j]).filter(Boolean));
      if (colors.size >= 3) res.buildings += 5;
    }
  });

  // 들판: 2칸 이상 이어진 무리마다 5점
  const seen = new Set();
  b.forEach((_, i) => {
    if (tops[i] !== 'Y' || seen.has(i)) return;
    let size = 0; const st = [i]; seen.add(i);
    while (st.length) {
      const x = st.pop(); size++;
      for (const y of NEIGHBORS[x]) if (tops[y] === 'Y' && !seen.has(y)) { seen.add(y); st.push(y); }
    }
    if (size >= 2) res.fields += 5;
  });

  // 강: 가장 긴 물길
  const water = [];
  tops.forEach((t, i) => { if (t === 'B') water.push(i); });
  res.riverLen = longestPath(water);
  res.water = riverPoints(res.riverLen);

  for (const c of p.cards) {
    if (c.placed > 0) res.animals += ANIMAL_BY_ID[c.id].points[c.placed - 1];
  }
  res.total = res.trees + res.mountains + res.fields + res.buildings + res.water + res.animals;
  return res;
}

function finish(s) {
  s.phase = 'over';
  const results = s.players.map((p, i) => ({ index: i, name: p.name, ...scoreBoard(p) }));
  const ranked = [...results].sort((a, b) => b.total - a.total);
  const winners = ranked.filter((r) => r.total === ranked[0].total).map((r) => r.index);
  s.final = { results, ranked, winners };
  s.turn = { tray: [], took: null, tookCard: true, cubesThisTurn: 0 };
}

// 테스트용: 전체 토큰 수 보존
export function countTokens(s) {
  let n = s.bag.length + s.discard.length + s.turn.tray.length;
  for (const c of s.center) n += c.length;
  for (const p of s.players) for (const c of p.board) n += c.stack.length;
  return n;
}
