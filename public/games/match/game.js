import {
  getEtDateKey,
  loadTop3,
  submitScore,
  formatTimeMs,
} from './leaderboard.js';

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

const howToBtn = document.getElementById('howToBtn');
const howToModal = document.getElementById('howToModal');
const closeHowToBtn = document.getElementById('closeHowToBtn');

function openHowTo() {
  if (!howToModal) return;
  howToModal.classList.remove('hidden');
}

function closeHowTo() {
  if (!howToModal) return;
  howToModal.classList.add('hidden');
}

howToBtn?.addEventListener('click', openHowTo);
closeHowToBtn?.addEventListener('click', closeHowTo);

// Optional: close when clicking outside the card
howToModal?.addEventListener('click', (e) => {
  if (e.target === howToModal) closeHowTo();
});

// Optional: close on Escape
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'Escape' &&
    howToModal &&
    !howToModal.classList.contains('hidden')
  ) {
    closeHowTo();
  }
});

SFX.click.volume = 0.18;
SFX.match.volume = 0.28;
SFX.win.volume = 0.35;

function playSfx(aud) {
  aud.currentTime = 0;
  aud.play().catch(() => {});
}

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
  hideModal();

  const mode = modeSelect.value;
  const cfg = MODES[mode];

  // Randomly choose a pack each game (even if only one exists)
  const pack = PACKS[Math.floor(Math.random() * PACKS.length)];

  // Build deck: choose N unique faces, duplicate, shuffle
  const chosenFaces = pickUnique(pack.faces, cfg.pairs);
  const deck = shuffle(
    [...chosenFaces, ...chosenFaces].map((src, idx) => ({
      id: `${idx}-${src}`,
      faceSrc: src,
      pairKey: src, // pairing by face source is fine
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
    flipped: [], // indices currently flipped (max 2)
    lockInput: false,
    attemptsFlipCount: 0, // counts flips toward moves definition
  };

  setupBoardGrid(cfg.rows, cfg.cols);
  renderBoard();
  updateHud(0);
}

function setupBoardGrid(rows, cols) {
  // IMPORTANT:
  // Do NOT set gridTemplateColumns to 1fr; that breaks the Redacted-style sizing.
  // Let CSS control sizing via --cols/--rows + --tile.
  boardEl.style.setProperty('--rows', String(rows));
  boardEl.style.setProperty('--cols', String(cols));
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

    btn.addEventListener('click', () => onTileClick(idx, tile));

    boardEl.appendChild(tile);
  });

  // HUD reset
  pairsEl.textContent = `0 / ${state.cfg.pairs}`;
  movesEl.textContent = '0';
  timeEl.textContent = '00:00.000';
}

function onTileClick(idx, tileEl) {
  if (!state || state.lockInput) return;

  const card = state.deck[idx];
  if (card.matched) return;

  // prevent flipping same tile twice in the same attempt
  if (state.flipped.includes(idx)) return;

  // max 2 tiles flipped at once
  if (state.flipped.length >= 2) return;

  // timer starts on first flip
  if (!state.firstFlipAt) {
    state.firstFlipAt = performance.now();
    tickTimer();
  }

  flipUp(idx, tileEl);
  playSfx(SFX.click);

  // Move counting locked: 1 move = 2 tiles flipped (one attempt)
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
  const [aIdx, bIdx] = state.flipped;
  const a = state.deck[aIdx];
  const b = state.deck[bIdx];

  const aTile = boardEl.querySelector(`.tile[data-index="${aIdx}"]`);
  const bTile = boardEl.querySelector(`.tile[data-index="${bIdx}"]`);

  if (!aTile || !bTile) return;

  state.lockInput = true;

  const isMatch = a.pairKey === b.pairKey;

  if (isMatch) {
    a.matched = true;
    b.matched = true;
    playSfx(SFX.match);

    aTile.classList.add('matched');
    bTile.classList.add('matched');

    state.matchedPairs++;
    pairsEl.textContent = `${state.matchedPairs} / ${state.cfg.pairs}`;

    state.flipped = [];
    state.lockInput = false;

    if (state.matchedPairs === state.cfg.pairs) {
      finishGame();
    }
  } else {
    // mismatch feedback + flip back after ~750ms
    aTile.classList.add('shake');
    bTile.classList.add('shake');

    window.setTimeout(() => {
      aTile.classList.remove('shake');
      bTile.classList.remove('shake');
    }, 280);

    window.setTimeout(() => {
      flipDown(aIdx, aTile);
      flipDown(bIdx, bTile);
      state.flipped = [];
      state.lockInput = false;
    }, 750);
  }
}

function flipUp(idx, tileEl) {
  tileEl.classList.add('flipped');
}

function flipDown(idx, tileEl) {
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
  if (state.timerRaf) cancelAnimationFrame(state.timerRaf);

  const elapsed = state.endAt - state.firstFlipAt;

  // Save score (daily top3 per mode, ET reset by key)
  const result = submitScore({
    mode: state.mode,
    timeMs: Math.floor(elapsed),
    moves: state.moves,
    completedAt: Date.now(),
  });

  finalTimeEl.textContent = formatTimeMs(elapsed);
  finalMovesEl.textContent = String(state.moves);

  playSfx(SFX.win);

  showModal();

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

function showModal() {
  modal.classList.remove('hidden');
}

function hideModal() {
  modal.classList.add('hidden');
}

function shuffle(arr) {
  // Fisher–Yates
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
  // partial shuffle selection
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
