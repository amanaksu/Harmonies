import * as E from '../engine.js';

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// 보드 모양
assert(E.CELLS.length === 23, 'board has 23 cells');
assert(E.NEIGHBORS.every((ns, i) => ns.every((j) => E.NEIGHBORS[j].includes(i))), 'neighbors symmetric');
assert(Math.max(...E.NEIGHBORS.map((n) => n.length)) === 6, 'interior cell has 6 neighbors');

// 회전 6번이면 제자리
for (const a of E.ANIMALS) {
  const r = E.rotations(a.pattern);
  assert(r.length === 6, 'six rotations');
  // 패턴 칸들이 서로 이어져 있는지 (중심에서 최대 2칸)
  for (const [q, r2] of a.pattern) assert(Math.max(Math.abs(q), Math.abs(r2), Math.abs(q + r2)) <= 2, `pattern too wide: ${a.id}`);
}

// 쌓기 규칙
const C = (stack, cube = null) => ({ stack, cube });
assert(E.canStack(C([]), 'B') && !E.canStack(C(['B']), 'B'), 'water only on empty');
assert(E.canStack(C(['S', 'S']), 'S') && !E.canStack(C(['S', 'S', 'S']), 'S'), 'mountain up to 3');
assert(E.canStack(C(['N']), 'N') && !E.canStack(C(['N', 'N']), 'N'), 'trunk up to 2');
assert(E.canStack(C(['N', 'N']), 'G') && !E.canStack(C(['G']), 'G'), 'leaf on trunks');
assert(E.canStack(C(['S']), 'R') && E.canStack(C(['R']), 'R') && !E.canStack(C(['S', 'S']), 'R'), 'roof rules');
assert(!E.canStack(C([], 'frog'), 'B'), 'no stacking on cube');

// 강 점수
assert(E.riverPoints(1) === 0 && E.riverPoints(2) === 2 && E.riverPoints(6) === 15 && E.riverPoints(8) === 23, 'river table');

// 패턴 인식: 개구리(물 + 아래 잎)를 어떤 방향으로 놓아도 찾는지
{
  const g = E.newGame(['a', 'b'], mulberry32(1));
  const p = g.players[0];
  const center = E.cellAt(2, 1); // 가운데 근처 칸
  assert(center !== undefined, 'center exists');
  for (const j of E.NEIGHBORS[center]) {
    p.board.forEach((c) => { c.stack = []; c.cube = null; });
    p.board[center].stack = ['B'];
    p.board[j].stack = ['G'];
    assert(E.cubeSpots(p.board, 'frog').includes(center), 'frog any rotation');
  }
}

// 무작위 대국
let games = 0, maxTotal = 0, sumTotal = 0, cubes = 0;
for (let seed = 1; seed <= 300; seed++) {
  const rng = mulberry32(seed);
  const n = 2 + (seed % 3);
  const s = E.newGame(Array.from({ length: n }, (_, i) => `P${i + 1}`), rng);
  let guard = 0;
  while (s.phase === 'play') {
    const spaces = s.center.map((c, i) => (c.length ? i : -1)).filter((i) => i >= 0);
    assert(spaces.length > 0, 'no center space to take');
    if (rng() < 0.4 && E.canTakeCard(s) && s.river.length) E.takeCard(s, Math.floor(rng() * s.river.length));
    E.takeTokens(s, pick(spaces, rng));
    while (s.turn.tray.length) {
      // 놓을 수 있는 토큰부터
      const idx = s.turn.tray.findIndex((t) => E.legalCellsForToken(s, t).length);
      if (idx < 0) break;
      E.placeToken(s, idx, pick(E.legalCellsForToken(s, s.turn.tray[idx]), rng));
    }
    // 가능한 큐브는 모두 놓기
    const p = E.curPlayer(s);
    let placed = true;
    while (placed) {
      placed = false;
      p.cards.forEach((c, ci) => {
        if (c.done) return;
        const spots = E.cubeSpots(p.board, c.id);
        if (spots.length) { E.placeCube(s, ci, spots[0]); placed = true; cubes++; }
      });
    }
    assert(E.openCards(p).length <= E.HAND_LIMIT, 'hand limit');
    assert(E.countTokens(s) === 120, `token count ${E.countTokens(s)}`);
    for (const c of p.board) assert(c.stack.length <= 3, 'stack too tall');
    E.endTurn(s);
    if (++guard > 500) throw new Error('game did not end');
  }
  games++;
  for (const r of s.final.results) { maxTotal = Math.max(maxTotal, r.total); sumTotal += r.total; }
}
console.log(`landscape: ${games} games ok, avg total ${(sumTotal / games / 3).toFixed(1)}, max ${maxTotal}, cubes ${cubes}`);

// 강 길이 계산 성능: 물로 꽉 찬 보드
{
  const g = E.newGame(['a', 'b'], mulberry32(2));
  g.players[0].board.forEach((c) => { c.stack = ['B']; });
  const t0 = Date.now();
  const r = E.scoreBoard(g.players[0]);
  console.log(`full-water river len ${r.riverLen} in ${Date.now() - t0}ms`);
  assert(r.riverLen === 23, 'hamiltonian path on full board');
}
