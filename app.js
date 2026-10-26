import * as E from './engine.js';
import { PLAYER_COLORS, esc, openModal, closeModal, toast, store, openSetup } from './assets/ui.js';

const SAVE_KEY = 'landscape:game';
const NAME_KEY = 'landscape:names';

let s = null;          // 게임 상태
let snap = null;       // 차례 시작 때의 상태 (되돌리기용)
let selTray = null;    // 고른 토큰(트레이 위치)
let selCard = null;    // 고른 내 카드(손 위치)
let started = false;

const $ = (id) => document.getElementById(id);

// ---------- 토큰 그림 ----------
const COLOR = { B: '#3f82c4', Y: '#e5c043', S: '#8e949d', N: '#8a5a3a', G: '#4c9a4f', R: '#c8553d' };
const RIM = { B: '#2c5f92', Y: '#b8952a', S: '#6a6f77', N: '#5f3d27', G: '#356f38', R: '#94392a' };
const ICON = {
  B: '<path d="M-.6 -.16q.15-.18.3 0t.3 0t.3 0t.3 0M-.6 .2q.15-.18.3 0t.3 0t.3 0t.3 0" stroke="#e8f2fb" stroke-width=".11" fill="none" stroke-linecap="round"/>',
  Y: '<path d="M-.3 .46V-.05M0 .46V-.2M.3 .46V-.05" stroke="#6e500c" stroke-width=".09" stroke-linecap="round"/><g fill="#6e500c"><ellipse cx="-.3" cy="-.2" rx=".1" ry=".18"/><ellipse cx="0" cy="-.36" rx=".1" ry=".18"/><ellipse cx=".3" cy="-.2" rx=".1" ry=".18"/></g>',
  S: '<path d="M-.58 .38-.12-.4.1-.03.22-.22.58.38Z" fill="#eef0f3"/>',
  N: '<circle r=".42" fill="none" stroke="#e9d2b6" stroke-width=".08"/><circle r=".23" fill="none" stroke="#e9d2b6" stroke-width=".08"/><circle r=".06" fill="#e9d2b6"/>',
  G: '<path d="M0-.52C.44-.3.44.26 0 .52-.44.26-.44-.3 0-.52Z" fill="#e1f3da"/><path d="M0-.36V.4" stroke="#4c9a4f" stroke-width=".08"/>',
  R: '<path d="M-.52.04 0-.46.52.04V.42H-.52Z" fill="#fde6dc"/><rect x="-.12" y=".12" width=".24" height=".3" fill="#c8553d"/>',
};
const disc = (tok, r, cx = 0, cy = 0, icon = true) =>
  `<g transform="translate(${cx} ${cy})"><circle r="${r}" fill="${COLOR[tok]}" stroke="${RIM[tok]}" stroke-width="${r * 0.09}"/>${
    icon ? `<g transform="scale(${r})">${ICON[tok]}</g>` : ''}</g>`;

// 한 칸 위의 더미 그리기 (아래층은 살짝 아래로 비켜서 보이게)
function stackSVG(stack, cx, cy, s0) {
  const h = stack.length;
  if (!h) return '';
  const r = s0 * 0.62;
  const off = s0 * 0.14;
  let out = '';
  stack.forEach((tok, k) => {
    const y = cy + (h - 1 - k) * off - (h - 1) * off / 2;
    out += disc(tok, r, cx, y, k === h - 1);
  });
  if (h >= 2) {
    const bx = cx + s0 * 0.5, by = cy + s0 * 0.48;
    out += `<g class="hbadge"><circle cx="${bx}" cy="${by}" r="${s0 * 0.22}" fill="#fffaf0" stroke="#3a3326" stroke-width="${s0 * 0.04}"/>
      <text x="${bx}" y="${by}" font-size="${s0 * 0.3}" text-anchor="middle" dominant-baseline="central" fill="#3a3326" font-weight="700">${h}</text></g>`;
  }
  return out;
}

const SQ3 = Math.sqrt(3);
const hexPoints = (cx, cy, s0) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k;
    return `${(cx + s0 * Math.cos(a)).toFixed(2)},${(cy + s0 * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
const hexCenter = (q, r, s0) => [s0 * 1.5 * q, s0 * SQ3 * (r + q / 2)];

// ---------- 보드 ----------
const S0 = 34;
function boardSVG(p, pi, { active, legal, spots }) {
  const cells = E.CELLS.map((c, i) => {
    const [x, y] = hexCenter(c.q, c.r, S0);
    const cell = p.board[i];
    const isLegal = legal.has(i);
    const isSpot = spots.has(i);
    const cls = ['hex', isLegal ? 'legal' : '', isSpot ? 'spot' : ''].join(' ');
    let cube = '';
    if (cell.cube) {
      const a = E.ANIMAL_BY_ID[cell.cube];
      cube = `<g class="cube"><circle cx="${x + S0 * 0.42}" cy="${y - S0 * 0.5}" r="${S0 * 0.34}" fill="${PLAYER_COLORS[pi]}" stroke="#2a2a2a" stroke-width="1.5"/>
        <text x="${x + S0 * 0.42}" y="${y - S0 * 0.47}" font-size="${S0 * 0.4}" text-anchor="middle" dominant-baseline="central">${a.emoji}</text></g>`;
    }
    const clickable = active && (isLegal || isSpot);
    return `<g class="${cls}" data-cell="${i}" ${clickable ? `role="button" tabindex="0" aria-label="${i + 1}번 칸"` : ''}>
      <polygon points="${hexPoints(x, y, S0 - 1.5)}"/>
      ${stackSVG(cell.stack, x, y, S0)}${cube}</g>`;
  }).join('');
  const minX = -S0, maxX = S0 * 7, minY = -S0 * SQ3 / 2, maxY = S0 * SQ3 * 4.5;
  return `<svg class="board-svg" viewBox="${minX - 4} ${minY - 6} ${maxX - minX + 8} ${maxY - minY + 12}" aria-label="${esc(p.name)}의 풍경">${cells}</svg>`;
}

// ---------- 카드 ----------
function patternSVG(animal) {
  const s0 = 20;
  const pts = animal.pattern.map(([q, r, t, h]) => { const [x, y] = hexCenter(q, r, s0); return { x, y, t, h }; });
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs) - s0, maxX = Math.max(...xs) + s0;
  const minY = Math.min(...ys) - s0, maxY = Math.max(...ys) + s0;
  const body = pts.map((p, k) => `
    <polygon points="${hexPoints(p.x, p.y, s0 - 1)}" class="${k === 0 ? 'pat-cube' : 'pat-cell'}"/>
    ${stackSVG(Array.from({ length: p.h }, (_, j) => (j === p.h - 1 ? p.t : baseFor(p.t))), p.x, p.y, s0)}`).join('');
  return `<svg class="pattern" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" aria-hidden="true">${body}</svg>`;
}
// 패턴 그림에서 아래층 색 (실제 판정은 맨 위 색과 높이만 본다)
const baseFor = (t) => (t === 'G' ? 'N' : t === 'S' ? 'S' : t === 'R' ? 'S' : t);

function cardHTML(id, { placed = 0, attrs = '', cls = '', badge = '' } = {}) {
  const a = E.ANIMAL_BY_ID[id];
  const track = a.points.map((pt, k) =>
    `<li class="${k < placed ? 'got' : ''} ${k === placed - 1 ? 'cur' : ''}">${pt}</li>`).join('');
  return `<button class="acard ${cls}" ${attrs}>
    ${patternSVG(a)}
    <span class="ainfo">
      <span class="aname"><span class="emoji">${a.emoji}</span>${a.name}${badge}</span>
      <ol class="track" aria-label="점수: ${a.points.join(', ')}">${track}</ol>
    </span>
  </button>`;
}

// ---------- 저장 ----------
function save() { if (started) store.set(SAVE_KEY, { s, snap }); }

// ---------- 그리기 ----------
function render() {
  document.body.dataset.players = s.players.length;
  renderStatus();
  renderSide();
  renderBoards();
  save();
}

function renderStatus() {
  const p = E.curPlayer(s);
  if (s.phase === 'over') { $('status').textContent = '게임 끝'; return; }
  const last = s.endTriggered ? ' · <b class="last">마지막 바퀴</b>' : '';
  $('status').innerHTML = `${s.turnNo}번째 바퀴 · <b style="color:${PLAYER_COLORS[s.current]}">${esc(p.name)}</b> 차례${last}`;
}

function hintText() {
  if (s.phase === 'over') return '게임이 끝났어요. <b>새 게임</b>으로 다시 시작할 수 있어요.';
  const p = E.curPlayer(s);
  const t = s.turn;
  if (selCard !== null) {
    const a = E.ANIMAL_BY_ID[p.cards[selCard].id];
    const n = E.cubeSpots(p.board, a.id).length;
    return n
      ? `<b>${a.emoji} ${a.name}</b> 패턴이 맞는 칸이 빛나요. 누르면 ${a.name}이(가) 살게 돼요. 패턴은 돌려서 맞춰도 돼요.`
      : `<b>${a.emoji} ${a.name}</b> 패턴이 맞는 칸이 아직 없어요. 카드 왼쪽 그림처럼 토큰을 쌓아 보세요. 큰 테두리 칸에 동물이 올라가요.`;
  }
  if (t.took === null) return `<b>${esc(p.name)}</b>님, 아래 토큰 자리 하나를 골라 토큰 3개를 가져오세요. 동물 카드는 차례 중 언제든 1장 가져올 수 있어요.`;
  if (t.tray.length) {
    const stuck = E.stuckTokens(s).length;
    if (stuck === t.tray.length) return '남은 토큰은 놓을 곳이 없어요. <b>차례 마치기</b>를 누르면 버려져요.';
    if (selTray !== null) return `<b>${E.TOKENS[t.tray[selTray]].name}</b> 토큰을 놓을 칸을 보드에서 고르세요. 빛나는 칸에만 놓을 수 있어요.`;
    return '가져온 토큰을 하나 골라 보드에 놓으세요.';
  }
  return '동물을 올리거나 카드를 가져온 다음 <b>차례 마치기</b>를 누르세요.';
}

function renderSide() {
  const t = s.turn;
  const over = s.phase === 'over';
  const tray = t.took === null
    ? '<span class="empty-note">아직 가져오지 않았어요</span>'
    : t.tray.length
      ? t.tray.map((tok, i) => {
        const can = E.legalCellsForToken(s, tok).length > 0;
        return `<button class="tok ${selTray === i ? 'sel' : ''} ${can ? '' : 'stuck'}" data-tray="${i}" aria-label="${E.TOKENS[tok].name} 토큰">
          <svg viewBox="-1 -1 2 2">${disc(tok, 0.92)}</svg><span>${E.TOKENS[tok].name}</span></button>`;
      }).join('')
      : '<span class="empty-note">모두 놓았어요</span>';

  const canEnd = !over && E.canEndTurn(s);
  const stuck = canEnd && t.tray.length > 0;
  const endLabel = stuck ? '남은 토큰 버리고 마치기' : '차례 마치기';

  const spaces = s.center.map((toks, i) => {
    const disabled = over || t.took !== null || toks.length === 0;
    const isTaken = t.took === i;
    return `<button class="space ${isTaken ? 'taken' : ''}" data-space="${i}" ${disabled ? 'disabled' : ''}
      aria-label="토큰 자리 ${i + 1}: ${toks.map((k) => E.TOKENS[k].name).join(', ') || '비어 있음'}">
      ${toks.length ? toks.map((k) => `<svg viewBox="-1 -1 2 2">${disc(k, 0.9)}</svg>`).join('') : '<span class="empty-note">비어 있음</span>'}
    </button>`;
  }).join('');

  const canCard = !over && E.canTakeCard(s);
  const river = s.river.map((id, i) => cardHTML(id, {
    attrs: `data-river="${i}" ${canCard ? '' : 'disabled'}`,
  })).join('');
  const cardNote = over ? '' : t.tookCard ? '이번 차례에 이미 가져왔어요' :
    E.openCards(E.curPlayer(s)).length >= E.HAND_LIMIT ? '진행 중인 카드가 4장이면 더 못 가져와요' : '눌러서 1장 가져오기';

  $('side').innerHTML = `
    <div class="hint">${hintText()}</div>
    ${over ? '' : `<section class="panel turn-panel">
      <div class="tray">${tray}</div>
      <div class="turn-actions">
        <button class="btn" id="btn-undo" ${over || !snap ? 'disabled' : ''}>이번 차례 되돌리기</button>
        <button class="btn primary" id="btn-end" ${canEnd ? '' : 'disabled'}>${endLabel}</button>
      </div>
    </section>`}
    <section class="panel">
      <h2>토큰 자리 <small>주머니 ${s.bag.length}개</small></h2>
      <div class="spaces">${spaces}</div>
    </section>
    <section class="panel">
      <h2>동물 카드 <small>${cardNote}</small></h2>
      <div class="river">${river || '<span class="empty-note">남은 카드가 없어요</span>'}</div>
    </section>`;
}

const SCORE_ITEMS = [
  ['trees', '나무'], ['mountains', '산'], ['fields', '들판'], ['buildings', '건물'], ['water', '강'], ['animals', '동물'],
];

function renderBoards() {
  $('boards').innerHTML = s.players.map((p, pi) => {
    const active = pi === s.current && s.phase === 'play';
    let legal = new Set(), spots = new Set();
    if (active && selCard !== null) spots = new Set(E.cubeSpots(p.board, p.cards[selCard].id));
    else if (active && selTray !== null && s.turn.tray[selTray]) legal = new Set(E.legalCellsForToken(s, s.turn.tray[selTray]));

    const sc = E.scoreBoard(p);
    const chips = SCORE_ITEMS.map(([k, label]) =>
      `<span class="chip"><i class="chip-${k}"></i>${label} <b>${sc[k]}</b>${k === 'water' && sc.riverLen ? `<small>(${sc.riverLen}칸)</small>` : ''}</span>`).join('');

    const open = p.cards.map((c, ci) => ({ c, ci })).filter(({ c }) => !c.done);
    const hand = open.map(({ c, ci }) => {
      const can = active && E.cubeSpots(p.board, c.id).length > 0;
      return cardHTML(c.id, {
        placed: c.placed,
        cls: `${selCard === ci && active ? 'sel' : ''} ${can ? 'can' : ''}`,
        attrs: active ? `data-hand="${ci}"` : 'disabled',
        badge: can ? '<span class="can-dot" title="지금 올릴 수 있어요">가능</span>' : '',
      });
    }).join('');
    const done = p.cards.filter((c) => c.done)
      .map((c) => { const a = E.ANIMAL_BY_ID[c.id]; return `<span class="done-card">${a.emoji} ${a.name} <b>${a.points[a.points.length - 1]}</b></span>`; }).join('');
    const empty = p.board.filter((c) => c.stack.length === 0).length;

    return `<article class="pboard ${active ? 'active' : ''}" data-p="${pi}">
      <header>
        <span class="pdot" style="background:${PLAYER_COLORS[pi]}"></span>
        <h2>${esc(p.name)}</h2>
        ${active ? '<span class="turn-badge">차례</span>' : ''}
        <span class="score">${sc.total}<small>점</small></span>
      </header>
      ${boardSVG(p, pi, { active, legal, spots })}
      <div class="empties">빈 칸 ${empty}개${empty <= 2 ? ' · 끝나는 조건' : ''}</div>
      <div class="chips">${chips}</div>
      <div class="hand">${hand || `<span class="empty-note">${active ? '진행 중인 동물 카드가 없어요' : '동물 카드 없음'}</span>`}</div>
      ${done ? `<div class="done-list">완성 ${done}</div>` : ''}
    </article>`;
  }).join('');
}

// ---------- 입력 ----------
function firstPlaceable() {
  const i = s.turn.tray.findIndex((t) => E.legalCellsForToken(s, t).length > 0);
  return i >= 0 ? i : null;
}

function act(fn) {
  try { fn(); } catch (err) { toast(err.message); }
  render();
}

$('side').addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el || el.disabled) return;
  if (el.dataset.space !== undefined) {
    act(() => { E.takeTokens(s, +el.dataset.space); selCard = null; selTray = firstPlaceable(); });
  } else if (el.dataset.tray !== undefined) {
    const i = +el.dataset.tray;
    if (el.classList.contains('stuck')) { toast('이 토큰은 지금 놓을 곳이 없어요'); return; }
    selTray = selTray === i ? null : i; selCard = null; render();
  } else if (el.dataset.river !== undefined) {
    const a = E.ANIMAL_BY_ID[s.river[+el.dataset.river]];
    act(() => { E.takeCard(s, +el.dataset.river); toast(`${a.emoji} ${a.name} 카드를 가져왔어요`); });
  } else if (el.id === 'btn-end') {
    endTurn();
  } else if (el.id === 'btn-undo') {
    const back = JSON.parse(snap);
    s = back; selTray = null; selCard = null; render(); toast('이번 차례를 처음으로 되돌렸어요');
  }
});

function endTurn() {
  const before = s.endTriggered;
  act(() => {
    E.endTurn(s);
    selTray = null; selCard = null;
    snap = JSON.stringify(s);
  });
  if (s.phase === 'over') { showFinal(); return; }
  if (!before && s.endTriggered) {
    const by = s.players[s.endTriggered.by].name;
    const why = s.endTriggered.reason === 'board' ? `${by}님 보드의 빈 칸이 2개 이하가 됐어요` : '주머니의 토큰이 다 떨어졌어요';
    toast(`${why}. 이번 바퀴가 끝나면 게임이 끝나요`, 3600);
  } else {
    toast(`${E.curPlayer(s).name}님 차례예요`);
  }
}

function onBoard(e) {
  const g = e.target.closest('[data-cell]');
  if (!g) return;
  const art = g.closest('.pboard');
  if (+art.dataset.p !== s.current || s.phase !== 'play') return;
  const i = +g.dataset.cell;
  const p = E.curPlayer(s);
  if (selCard !== null) {
    if (!E.cubeSpots(p.board, p.cards[selCard].id).includes(i)) return;
    act(() => {
      const card = E.placeCube(s, selCard, i);
      const a = E.ANIMAL_BY_ID[card.id];
      toast(card.done ? `${a.emoji} ${a.name} 카드 완성! ${a.points[a.points.length - 1]}점` : `${a.emoji} ${a.name}이(가) 자리 잡았어요`);
      if (card.done || !E.cubeSpots(p.board, card.id).length) selCard = null;
    });
  } else if (selTray !== null) {
    if (!E.canStack(p.board[i], s.turn.tray[selTray])) return;
    act(() => { E.placeToken(s, selTray, i); selTray = firstPlaceable(); });
  }
}
$('boards').addEventListener('click', (e) => {
  const h = e.target.closest('[data-hand]');
  if (h) {
    const ci = +h.dataset.hand;
    selCard = selCard === ci ? null : ci; selTray = null; render();
    return;
  }
  onBoard(e);
});
$('boards').addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-cell]')) { e.preventDefault(); onBoard(e); }
});

$('btn-new').addEventListener('click', () => {
  if (started && s.phase !== 'over') {
    const m = openModal(`<h2>새 게임을 시작할까요?</h2><p>지금 하던 게임은 사라져요.</p>
      <div class="row-actions"><button class="btn light" data-act="no">계속하기</button><button class="btn primary" data-act="yes">새 게임</button></div>`);
    m.querySelector('[data-act="no"]').onclick = closeModal;
    m.querySelector('[data-act="yes"]').onclick = () => { closeModal(); setup(false); };
  } else setup(false);
});
$('btn-rules').addEventListener('click', showRules);

// ---------- 모달 ----------
function showFinal() {
  const f = s.final;
  const winNames = f.winners.map((i) => esc(s.players[i].name)).join(', ');
  const rows = f.ranked.map((r) => `<tr class="${f.winners.includes(r.index) ? 'win' : ''}">
    <td><span class="pdot" style="display:inline-block;vertical-align:-2px;background:${PLAYER_COLORS[r.index]}"></span> ${esc(r.name)}</td>
    ${SCORE_ITEMS.map(([k]) => `<td>${r[k]}</td>`).join('')}<td class="total">${r.total}</td></tr>`).join('');
  const m = openModal(`<h2>최종 결과</h2>
    <p class="winner-line">${f.winners.length > 1 ? `${winNames} 공동 우승` : `${winNames} 우승!`}</p>
    <div class="table-wrap"><table class="result-table">
      <thead><tr><th>이름</th>${SCORE_ITEMS.map(([, l]) => `<th>${l}</th>`).join('')}<th>합계</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div class="row-actions"><button class="btn light" data-act="close">보드 보기</button><button class="btn primary" data-act="again">같은 사람들과 다시</button></div>`);
  m.querySelector('[data-act="close"]').onclick = closeModal;
  m.querySelector('[data-act="again"]').onclick = () => { closeModal(); start(s.players.map((p) => p.name)); };
}

function showRules() {
  const toks = E.TOKEN_KEYS.map((k) => `<span class="rule-tok"><svg viewBox="-1 -1 2 2">${disc(k, 0.9)}</svg>${E.TOKENS[k].name}</span>`).join('');
  const m = openModal(`<h2>풍경 쌓기 규칙</h2>
    <p>토큰을 쌓아 자기만의 풍경을 만들고, 그 풍경에 동물을 살게 해서 점수를 얻는 게임이에요. 2~4명, 30~40분.</p>
    <div class="rule-toks">${toks}</div>
    <h3>내 차례</h3>
    <ol>
      <li><b>꼭 할 일</b>: 토큰 자리 하나에서 토큰 3개를 모두 가져와 내 보드에 놓아요.</li>
      <li><b>해도 되는 일</b>: 동물 카드 1장 가져오기(진행 중인 카드는 최대 4장), 패턴이 맞는 곳에 동물 올리기(몇 번이든).</li>
      <li>순서는 자유예요. 실수했다면 <b>이번 차례 되돌리기</b>로 차례 처음으로 돌아갈 수 있어요.</li>
    </ol>
    <h3>쌓는 규칙</h3>
    <ul>
      <li>물·들판: 빈 칸에만, 1층.</li>
      <li>바위: 빈 칸이나 바위 위에, 3층까지.</li>
      <li>줄기: 빈 칸이나 줄기 1개 위에, 2층까지. 잎: 빈 칸이나 줄기 위에 (나무 꼭대기).</li>
      <li>지붕: 빈 칸이나 바위·줄기·지붕 1개 위에. 2층 지붕이 건물이에요.</li>
      <li>동물이 올라간 칸에는 더 쌓을 수 없어요.</li>
    </ul>
    <h3>동물 카드</h3>
    <p>카드 왼쪽 그림과 같은 모양(맨 위 토큰과 높이)이 보드에 있으면, 굵은 테두리 칸에 동물을 올려요. 패턴은 돌려도 되고, 다른 동물과 칸을 같이 써도 돼요(동물이 올라가는 칸만 겹치면 안 돼요). 동물을 올릴수록 카드 점수가 올라가고, 끝까지 채우면 완성이에요.</p>
    <h3>점수</h3>
    <ul>
      <li>나무: 잎이 맨 위인 칸. 높이 1/2/3 → 1/3/7점.</li>
      <li>산: 바위가 맨 위이고 옆에 다른 산이 있으면 높이 1/2/3 → 1/3/7점.</li>
      <li>들판: 들판이 2칸 이상 이어진 무리마다 5점.</li>
      <li>건물: 2층 지붕 둘레에 서로 다른 색(맨 위 기준)이 3가지 이상이면 5점.</li>
      <li>강: 가장 긴 물길 하나. 2/3/4/5/6칸 → 2/5/8/11/15점, 그 뒤로 1칸마다 +4점.</li>
      <li>동물: 각 카드에서 마지막으로 드러난 점수.</li>
    </ul>
    <h3>게임 끝</h3>
    <p>누군가의 빈 칸이 2개 이하가 되거나 주머니 토큰으로 자리를 채울 수 없으면, 그 바퀴를 마저 해서 모두 같은 횟수를 한 뒤 끝나요.</p>
    <div class="row-actions"><button class="btn primary" data-act="ok">알겠어요</button></div>`);
  m.querySelector('[data-act="ok"]').onclick = closeModal;
}

// ---------- 시작 ----------
function start(names) {
  s = E.newGame(names);
  snap = JSON.stringify(s);
  started = true;
  selTray = null; selCard = null;
  render();
}

function setup(allowResume) {
  const saved = store.get(SAVE_KEY);
  const canResume = allowResume && saved && saved.s && saved.s.phase === 'play';
  openSetup({
    title: '풍경 쌓기',
    intro: '한 화면에서 번갈아 두는 풍경 만들기 게임이에요. 2명이면 차례가 빨리 돌아와요.',
    canResume,
    nameKey: NAME_KEY,
    onStart: start,
    onResume: () => { s = saved.s; snap = saved.snap || JSON.stringify(s); started = true; render(); },
  });
}

s = E.newGame(['플레이어 1', '플레이어 2']);
render();
setup(true);
