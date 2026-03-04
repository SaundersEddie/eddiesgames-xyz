import {
  getEtDateKey,
  loadTop3,
  submitScore,
  formatTimeMs,
} from './matchLeaderboard.js';

const MODES = {
  easy: { rows: 4, cols: 4, pairs: 8 },
  medium: { rows: 4, cols: 6, pairs: 12 },
  hard: { rows: 6, cols: 6, pairs: 18 },
};

const PACKS = [
  {
    id: 'cards',
    faces: Array.from(
      { length: 29 },
      (_, i) => `assets/pack1/${String(i + 1).padStart(2, '0')}.png`,
    ),
  },
];

const LS_MODE = 'match:mode';

const $ = (sel) => document.querySelector(sel);

const boardEl = $('#board');
const timeEl = $('#time');
const movesEl = $('#moves');
const pairsEl = $('#pairs');

const modeSelect = $('#modeSelect');
const restartBtn = $('#restartBtn');

const modal = $('#modal');
const finalTimeEl = $('#finalTime');
const finalMovesEl = $('#finalMoves');
const playAgainBtn = $('#playAgainBtn');
const closeModalBtn = $('#closeModalBtn');

const lbDateEl = $('#lbDate');
const lbEasyEl = $('#lbEasy');
const lbMediumEl = $('#lbMedium');
const lbHardEl = $('#lbHard');

let state = null;

const SFX = {
  click: new Audio('/games/match/sounds/click.mp3'),
  match: new Audio('/games/match/sounds/match.mp3'),
  win: new Audio('/games/match/sounds/win.mp3'),
};

// ---------- Share / Copy ----------
const FRONT_PAGE_URL = 'https://eddiesgames.xyz';

function formatShareTimeMs(ms) {
  // you probably get "MM:SS.mmm" from formatTimeMs; we want "MM:SS"
  const s = formatTimeMs(ms);
  return s.includes('.') ? s.split('.')[0] : s;
}

function buildShareText({ rows, cols, timeMs, moves }) {
  return `🏆 MATCH • ${rows}x${cols}
⏱ ${formatShareTimeMs(timeMs)}
🎯 ${moves} moves

${FRONT_PAGE_URL}`;
}

async function copyTextToClipboard(text) {
  // modern
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  // fallback
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

SFX.click.volume = 0.18;
SFX.match.volume = 0.28;
SFX.win.volume = 0.35;

function playSfx(aud) {
  aud.currentTime = 0;
  aud.play().catch(() => {});
}

/* ===========================
   HOW TO MODAL (kept)
=========================== */
const howToBtn = document.getElementById('howToBtn');
const howToModal = document.getElementById('howToModal');
const closeHowToBtn = document.getElementById('closeHowToBtn');

function openHowTo() {
  howToModal?.classList.remove('hidden');
}
function closeHowTo() {
  howToModal?.classList.add('hidden');
}

howToBtn?.addEventListener('click', openHowTo);
closeHowToBtn?.addEventListener('click', closeHowTo);

howToModal?.addEventListener('click', (e) => {
  if (e.target === howToModal) closeHowTo();
});

document.addEventListener('keydown', (e) => {
  if (
    e.key === 'Escape' &&
    howToModal &&
    !howToModal.classList.contains('hidden')
  ) {
    closeHowTo();
  }
});

/* ===========================
   TIMER SAFETY (the fix)
=========================== */
function clearTimers() {
  if (!state) return;
  if (!state.timers) state.timers = [];
  state.timers.forEach((t) => clearTimeout(t));
  state.timers = [];
}

function safeSetTimeout(fn, ms) {
  const id = window.setTimeout(fn, ms);
  if (state) {
    if (!state.timers) state.timers = [];
    state.timers.push(id);
  }
  return id;
}

function cancelRaf() {
  if (!state) return;
  if (state.timerRaf) cancelAnimationFrame(state.timerRaf);
  state.timerRaf = null;
}

/* ===========================
   INIT
=========================== */
init();

function init() {
  const savedMode = localStorage.getItem(LS_MODE);
  if (savedMode && MODES[savedMode]) modeSelect.value = savedMode;

  modeSelect.addEventListener('change', () => {
    localStorage.setItem(LS_MODE, modeSelect.value);
    startNewGame();
  });

  restartBtn.addEventListener('click', () => startNewGame());

  playAgainBtn.addEventListener('click', () => {
    hideModal();
    startNewGame();
  });

  closeModalBtn.addEventListener('click', hideModal);

  startNewGame();
  renderLeaderboards();
}

function startNewGame() {
  // hard reset anything async from prior game
  if (state) {
    clearTimers();
    cancelRaf();
  }

  hideModal();

  const mode = modeSelect.value;
  const cfg = MODES[mode];

  const pack = PACKS[Math.floor(Math.random() * PACKS.length)];

  const chosenFaces = pickUnique(pack.faces, cfg.pairs);
  const deck = shuffle(
    [...chosenFaces, ...chosenFaces].map((src, idx) => ({
      id: `${idx}-${src}`,
      faceSrc: src,
      pairKey: src,
      matched: false,
    })),
  );

  state = {
    mode,
    cfg,
    pack,
    deck,
    firstFlipAt: null,
    endAt: null,
    timerRaf: null,
    moves: 0,
    matchedPairs: 0,
    flipped: [],
    lockInput: false,
    attemptsFlipCount: 0,
    timers: [], // ✅ store any setTimeout IDs
  };

  setupBoardGrid(cfg.rows, cfg.cols);
  renderBoard();
  updateHud(0);
}

// function setupBoardGrid(rows, cols) {
//   // keep your existing behavior
//   boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

//   // also support CSS custom props if you’re using them
//   boardEl.style.setProperty('--rows', String(rows));
//   boardEl.style.setProperty('--cols', String(cols));
// }

function setupBoardGrid(rows, cols) {
  // Let CSS control sizing (tile clamp math).
  boardEl.style.removeProperty('grid-template-columns');

  // Drive CSS custom props
  boardEl.style.setProperty('--rows', String(rows));
  boardEl.style.setProperty('--cols', String(cols));

  // Also expose attrs so CSS can tune per mode on mobile
  boardEl.dataset.rows = String(rows);
  boardEl.dataset.cols = String(cols);
}
function renderBoard() {
  boardEl.innerHTML = '';

  state.deck.forEach((card, idx) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.index = String(idx);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Tile');

    const cardEl = document.createElement('div');
    cardEl.className = 'card';

    const back = document.createElement('div');
    back.className = 'face back';
    back.setAttribute('aria-hidden', 'true');

    const front = document.createElement('div');
    front.className = 'face front';

    const faceImg = document.createElement('img');
    faceImg.alt = 'Face';
    faceImg.src = card.faceSrc;

    front.appendChild(faceImg);
    cardEl.appendChild(back);
    cardEl.appendChild(front);

    btn.appendChild(cardEl);
    tile.appendChild(btn);

    btn.addEventListener('click', () => onTileClick(idx));

    boardEl.appendChild(tile);
  });

  pairsEl.textContent = `0 / ${state.cfg.pairs}`;
  movesEl.textContent = '0';
  timeEl.textContent = '00:00.000';
}

function getTileEl(idx) {
  return boardEl.querySelector(`.tile[data-index="${idx}"]`);
}

function onTileClick(idx) {
  if (!state || state.lockInput) return;

  const card = state.deck[idx];
  if (!card || card.matched) return;

  // prevent flipping same tile twice in the same attempt
  if (state.flipped.includes(idx)) return;

  // max 2 tiles flipped at once
  if (state.flipped.length >= 2) return;

  // timer starts on first flip
  if (!state.firstFlipAt) {
    state.firstFlipAt = performance.now();
    tickTimer();
  }

  const tileEl = getTileEl(idx);
  if (!tileEl) return;

  flipUp(idx, tileEl);
  playSfx(SFX.click);

  // Move counting: 1 move = 2 flips
  state.attemptsFlipCount++;
  if (state.attemptsFlipCount % 2 === 0) {
    state.moves++;
    movesEl.textContent = String(state.moves);
  }

  state.flipped.push(idx);

  if (state.flipped.length === 2) {
    resolveAttempt();
  }
}

function resolveAttempt() {
  if (!state) return;

  // ✅ kill any pending mismatch flips from prior attempt
  clearTimers();

  const [aIdx, bIdx] = state.flipped;
  const a = state.deck[aIdx];
  const b = state.deck[bIdx];

  const aTile = getTileEl(aIdx);
  const bTile = getTileEl(bIdx);
  if (!a || !b || !aTile || !bTile) {
    state.flipped = [];
    state.lockInput = false;
    return;
  }

  state.lockInput = true;

  const isMatch = a.pairKey === b.pairKey;

  if (isMatch) {
    a.matched = true;
    b.matched = true;

    playSfx(SFX.match);

    // ✅ force permanent face-up + matched styling
    aTile.classList.add('flipped', 'matched');
    bTile.classList.add('flipped', 'matched');

    // optional: prevent interaction
    aTile.querySelector('button')?.setAttribute('disabled', 'true');
    bTile.querySelector('button')?.setAttribute('disabled', 'true');

    state.matchedPairs++;
    pairsEl.textContent = `${state.matchedPairs} / ${state.cfg.pairs}`;

    state.flipped = [];
    state.lockInput = false;

    if (state.matchedPairs === state.cfg.pairs) {
      finishGame();
    }
    return;
  }

  // mismatch feedback + flip back
  aTile.classList.add('shake');
  bTile.classList.add('shake');

  safeSetTimeout(() => {
    if (!state) return;
    aTile.classList.remove('shake');
    bTile.classList.remove('shake');
  }, 280);

  safeSetTimeout(() => {
    if (!state) return;
    flipDown(aIdx, aTile);
    flipDown(bIdx, bTile);
    state.flipped = [];
    state.lockInput = false;
  }, 750);
}

function flipUp(idx, tileEl) {
  tileEl.classList.add('flipped');
}

function flipDown(idx, tileEl) {
  if (!state) return;

  // ✅ absolute defense: matched tiles NEVER flip down
  if (state.deck[idx]?.matched) return;
  if (tileEl.classList.contains('matched')) return;

  tileEl.classList.remove('flipped');
}

function tickTimer() {
  if (!state || !state.firstFlipAt) return;

  const now = performance.now();
  const elapsed = now - state.firstFlipAt;

  timeEl.textContent = formatTimeMs(elapsed);

  state.timerRaf = requestAnimationFrame(tickTimer);
}

function finishGame() {
  if (!state) return;

  state.endAt = performance.now();
  cancelRaf();
  clearTimers(); // nothing else should fire post-win

  const elapsed = state.endAt - state.firstFlipAt;

  const result = submitScore({
    mode: state.mode,
    timeMs: Math.floor(elapsed),
    moves: state.moves,
    completedAt: Date.now(),
  });

  finalTimeEl.textContent = formatTimeMs(elapsed);
  finalMovesEl.textContent = String(state.moves);

  playSfx(SFX.win);

   const shareText = buildShareText({
    rows: state.cfg.rows,
    cols: state.cfg.cols,
    timeMs: Math.floor(elapsed),
    moves: state.moves,
  });

  showModal(shareText);

  renderLeaderboards(result.etDate);
}

function renderLeaderboards(etDate = getEtDateKey()) {
  lbDateEl.textContent = `ET Date: ${etDate}`;

  renderModeList(lbEasyEl, loadTop3('easy', etDate));
  renderModeList(lbMediumEl, loadTop3('medium', etDate));
  renderModeList(lbHardEl, loadTop3('hard', etDate));
}

function renderModeList(ol, entries) {
  ol.innerHTML = '';
  if (!entries.length) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="muted">No runs yet</span>`;
    ol.appendChild(li);
    return;
  }

  entries.forEach((e) => {
    const li = document.createElement('li');
    li.textContent = `${formatTimeMs(e.timeMs)}  •  ${e.moves} moves`;
    ol.appendChild(li);
  });
}

function updateHud(elapsedMs) {
  timeEl.textContent = formatTimeMs(elapsedMs);
  movesEl.textContent = String(state.moves);
  pairsEl.textContent = `${state.matchedPairs} / ${state.cfg.pairs}`;
}

function showModal(shareText = '') {
  modal.classList.remove('hidden');

  // Inject Share button once
  let shareRow = modal.querySelector('.shareRow');
  if (!shareRow) {
    // put it under the final stats (inside the modal content)
    const anchor = finalMovesEl?.parentElement || modal;

    shareRow = document.createElement('div');
    shareRow.className = 'shareRow';
    shareRow.innerHTML = `
      <button type="button" class="btn ghost" id="shareResultBtn">Share Result</button>
      <span class="shareHint" id="shareHint" aria-live="polite"></span>
    `;

    anchor.appendChild(shareRow);
  }

  const btn = shareRow.querySelector('#shareResultBtn');
  const hint = shareRow.querySelector('#shareHint');

  hint.textContent = '';

  btn.onclick = async () => {
    if (!shareText) return;
    const ok = await copyTextToClipboard(shareText);
    if (ok) {
      hint.textContent = 'Copied!';
    } else {
      hint.textContent = 'Copy failed';
    }
  };
}

function hideModal() {
  modal.classList.add('hidden');
}

/* ===========================
   Utils
=========================== */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickUnique(arr, n) {
  if (n > arr.length) {
    throw new Error(`Not enough faces in pack. Need ${n}, have ${arr.length}.`);
  }
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
