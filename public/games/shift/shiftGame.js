const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestTileEl = document.getElementById('bestTile');
const movesEl = document.getElementById('moves');

const modeSelect = document.getElementById('modeSelect');
const restartBtn = document.getElementById('restartBtn');

const howToBtn = document.getElementById('howToBtn');
const howToModal = document.getElementById('howToModal');
const closeHowToBtn = document.getElementById('closeHowToBtn');
const copyBtn = document.getElementById('copyBtn');

const modal = document.getElementById('modal');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const finalScoreEl = document.getElementById('finalScore');
const finalBestTileEl = document.getElementById('finalBestTile');
const finalMovesEl = document.getElementById('finalMoves');

const SFX = {
  move: new Audio('/games/shift/sounds/move.ogg'),
  merge: new Audio('/games/shift/sounds/merge.ogg'),
  win: new Audio('/games/shift/sounds/win.ogg'),
  gameover: new Audio('/games/shift/sounds/gameover.ogg'),
};

const FRONT_PAGE_URL = 'https://eddiesgames.xyz';

const SWIPE_THRESHOLD = 24;

let rng = Math.random;
let state = null;

const swipeState = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  handled: false,
};

SFX.move.volume = 0.15;
SFX.merge.volume = 0.25;
SFX.win.volume = 0.35;
SFX.gameover.volume = 0.35;

init();

function init() {
  startNewGame();

  window.addEventListener('keydown', handleKey);

  bindBoardTouchControls();

  restartBtn?.addEventListener('click', startNewGame);

  modeSelect?.addEventListener('change', () => {
    startNewGame();
  });

  howToBtn?.addEventListener('click', openHowTo);
  closeHowToBtn?.addEventListener('click', closeHowTo);

  howToModal?.addEventListener('click', (e) => {
    if (e.target === howToModal) closeHowTo();
  });

  playAgainBtn?.addEventListener('click', () => {
    closeGameOver();
    startNewGame();
  });

  closeModalBtn?.addEventListener('click', closeGameOver);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeGameOver();
  });

  copyBtn?.addEventListener('click', async () => {
    const text = buildShareText();
    const ok = await copyTextToClipboard(text);

    copyBtn.textContent = ok ? 'Copied!' : 'Failed';
    setTimeout(() => {
      copyBtn.textContent = 'Copy Score';
    }, 1500);
  });
}

function bindBoardTouchControls() {
  if (!boardEl) return;

  if ('PointerEvent' in window) {
    boardEl.addEventListener('pointerdown', onBoardPointerDown);
    boardEl.addEventListener('pointermove', onBoardPointerMove);
    boardEl.addEventListener('pointerup', onBoardPointerEnd);
    boardEl.addEventListener('pointercancel', onBoardPointerEnd);
    boardEl.addEventListener('pointerleave', onBoardPointerEnd);
    return;
  }

  // Fallback for older browsers
  boardEl.addEventListener('touchstart', onBoardTouchStart, { passive: true });
  boardEl.addEventListener('touchmove', onBoardTouchMove, { passive: false });
  boardEl.addEventListener('touchend', onBoardTouchEnd, { passive: true });
  boardEl.addEventListener('touchcancel', onBoardTouchEnd, { passive: true });
}

function onBoardPointerDown(e) {
  if (!isTouchLikePointer(e)) return;
  if (!canAcceptSwipeInput()) return;

  swipeState.active = true;
  swipeState.pointerId = e.pointerId;
  swipeState.startX = e.clientX;
  swipeState.startY = e.clientY;
  swipeState.handled = false;

  if (typeof boardEl.setPointerCapture === 'function') {
    try {
      boardEl.setPointerCapture(e.pointerId);
    } catch (_) {}
  }
}

function onBoardPointerMove(e) {
  if (!swipeState.active) return;
  if (swipeState.pointerId !== e.pointerId) return;
  if (swipeState.handled) return;
  if (!canAcceptSwipeInput()) return;

  const direction = getSwipeDirection(
    e.clientX - swipeState.startX,
    e.clientY - swipeState.startY,
  );

  if (!direction) return;

  e.preventDefault();
  swipeState.handled = true;
  attemptMove(direction);
}

function onBoardPointerEnd(e) {
  if (swipeState.pointerId !== e.pointerId) return;
  resetSwipeState();
}

function onBoardTouchStart(e) {
  if (!canAcceptSwipeInput()) return;
  if (!e.touches.length) return;

  const touch = e.touches[0];

  swipeState.active = true;
  swipeState.pointerId = 'touch';
  swipeState.startX = touch.clientX;
  swipeState.startY = touch.clientY;
  swipeState.handled = false;
}

function onBoardTouchMove(e) {
  if (!swipeState.active) return;
  if (swipeState.handled) return;
  if (!canAcceptSwipeInput()) return;
  if (!e.touches.length) return;

  const touch = e.touches[0];
  const direction = getSwipeDirection(
    touch.clientX - swipeState.startX,
    touch.clientY - swipeState.startY,
  );

  if (!direction) return;

  e.preventDefault();
  swipeState.handled = true;
  attemptMove(direction);
}

function onBoardTouchEnd() {
  resetSwipeState();
}

function resetSwipeState() {
  swipeState.active = false;
  swipeState.pointerId = null;
  swipeState.startX = 0;
  swipeState.startY = 0;
  swipeState.handled = false;
}

function isTouchLikePointer(e) {
  return e.pointerType === 'touch' || e.pointerType === 'pen';
}

function canAcceptSwipeInput() {
  if (!state || state.gameOver) return false;
  if (isHowToOpen()) return false;
  if (isGameOverOpen()) return false;
  return true;
}

function isHowToOpen() {
  return howToModal && !howToModal.classList.contains('hidden');
}

function isGameOverOpen() {
  return modal && !modal.classList.contains('hidden');
}

function getSwipeDirection(dx, dy) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) {
    return null;
  }

  if (absX > absY) {
    return dx > 0 ? 'right' : 'left';
  }

  return dy > 0 ? 'down' : 'up';
}

function createSeededRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;

  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getEtDateKey() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

function startNewGame() {
  closeGameOver();
  closeHowTo();
  resetSwipeState();

  const mode = modeSelect?.value || 'random';

  if (mode === 'daily') {
    const key = getEtDateKey().replaceAll('-', '');
    rng = createSeededRng(Number(key));
  } else {
    rng = Math.random;
  }

  state = {
    mode,
    grid: makeEmptyGrid(),
    score: 0,
    moves: 0,
    bestTile: 0,
    gameOver: false,
  };

  spawnRandomTile();
  spawnRandomTile();

  updateBestTile();
  render();
}

function makeEmptyGrid() {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
}

function handleKey(e) {
  if (!state || state.gameOver) return;

  const key = e.key.toLowerCase();

  if (
    [
      'arrowleft',
      'arrowright',
      'arrowup',
      'arrowdown',
      'a',
      'd',
      'w',
      's',
    ].includes(key)
  ) {
    e.preventDefault();
  }

  if (key === 'arrowleft' || key === 'a') {
    attemptMove('left');
  } else if (key === 'arrowright' || key === 'd') {
    attemptMove('right');
  } else if (key === 'arrowup' || key === 'w') {
    attemptMove('up');
  } else if (key === 'arrowdown' || key === 's') {
    attemptMove('down');
  } else if (key === 'escape') {
    closeHowTo();
    closeGameOver();
  }
}

function attemptMove(direction) {
  if (!state || state.gameOver) return;

  const before = cloneGrid(state.grid);
  let anyMerged = false;

  if (direction === 'left') {
    anyMerged = moveLeft();
  } else if (direction === 'right') {
    anyMerged = moveRight();
  } else if (direction === 'up') {
    anyMerged = moveUp();
  } else if (direction === 'down') {
    anyMerged = moveDown();
  }

  if (gridsEqual(before, state.grid)) return;

  if (anyMerged) {
    playSfx(SFX.merge);
  } else {
    playSfx(SFX.move);
  }

  state.moves++;
  spawnRandomTile();
  updateBestTile();

  if (isGameOver()) {
    state.gameOver = true;
    render();
    openGameOver();
    return;
  }

  render();
}

function moveLeft() {
  const newGrid = [];
  let anyMerged = false;

  for (const row of state.grid) {
    const result = processRowLeft(row);
    state.score += result.scoreGained;
    if (result.merged) anyMerged = true;
    newGrid.push(result.row);
  }

  state.grid = newGrid;
  return anyMerged;
}

function moveRight() {
  const newGrid = [];
  let anyMerged = false;

  for (const row of state.grid) {
    const reversed = [...row].reverse();
    const result = processRowLeft(reversed);
    state.score += result.scoreGained;
    if (result.merged) anyMerged = true;
    newGrid.push(result.row.reverse());
  }

  state.grid = newGrid;
  return anyMerged;
}

function moveUp() {
  const transposed = transpose(state.grid);
  const newGrid = [];
  let anyMerged = false;

  for (const row of transposed) {
    const result = processRowLeft(row);
    state.score += result.scoreGained;
    if (result.merged) anyMerged = true;
    newGrid.push(result.row);
  }

  state.grid = transpose(newGrid);
  return anyMerged;
}

function moveDown() {
  const transposed = transpose(state.grid);
  const newGrid = [];
  let anyMerged = false;

  for (const row of transposed) {
    const reversed = [...row].reverse();
    const result = processRowLeft(reversed);
    state.score += result.scoreGained;
    if (result.merged) anyMerged = true;
    newGrid.push(result.row.reverse());
  }

  state.grid = transpose(newGrid);
  return anyMerged;
}

function processRowLeft(row) {
  let arr = row.filter((v) => v !== 0);
  let scoreGained = 0;
  let merged = false;

  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      scoreGained += arr[i];
      arr[i + 1] = 0;
      merged = true;
      i++;
    }
  }

  arr = arr.filter((v) => v !== 0);

  while (arr.length < 4) {
    arr.push(0);
  }

  return { row: arr, scoreGained, merged };
}

function spawnRandomTile() {
  const empties = [];

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (state.grid[r][c] === 0) {
        empties.push({ r, c });
      }
    }
  }

  if (!empties.length) return false;

  const pick = empties[Math.floor(rng() * empties.length)];
  state.grid[pick.r][pick.c] = rng() < 0.9 ? 2 : 4;
  return true;
}

function updateBestTile() {
  let max = 0;

  for (const row of state.grid) {
    for (const value of row) {
      if (value > max) max = value;
    }
  }

  state.bestTile = max;
}

function isGameOver() {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const value = state.grid[r][c];

      if (value === 0) return false;

      if (c < 3 && value === state.grid[r][c + 1]) return false;
      if (r < 3 && value === state.grid[r + 1][c]) return false;
    }
  }

  return true;
}

function transpose(grid) {
  return grid[0].map((_, c) => grid.map((row) => row[c]));
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function gridsEqual(a, b) {
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function openHowTo() {
  howToModal?.classList.remove('hidden');
}

function closeHowTo() {
  howToModal?.classList.add('hidden');
}

function openGameOver() {
  finalScoreEl.textContent = String(state.score);
  finalBestTileEl.textContent = String(state.bestTile);
  finalMovesEl.textContent = String(state.moves);
  playSfx(SFX.gameover);
  modal?.classList.remove('hidden');
}

function closeGameOver() {
  modal?.classList.add('hidden');
}

function render() {
  renderBoard();
  renderHud();
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (const row of state.grid) {
    for (const value of row) {
      const tile = document.createElement('div');
      tile.className = 'tile';

      const inner = document.createElement('div');
      inner.className = 'tileInner';

      if (value !== 0) {
        inner.textContent = String(value);
        inner.dataset.value = String(value);
        inner.classList.add('filled');
      }

      tile.appendChild(inner);
      boardEl.appendChild(tile);
    }
  }
}

function renderHud() {
  scoreEl.textContent = String(state.score);
  bestTileEl.textContent = String(state.bestTile);
  movesEl.textContent = String(state.moves);
}

function buildShareText() {
  const modeLabel = state.mode === 'daily' ? 'DAILY' : 'RANDOM';

  return `🏆 SHIFT • ${modeLabel}
🔢 ${state.bestTile}
⭐ ${state.score}
🎯 ${state.moves} moves

${FRONT_PAGE_URL}`;
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function playSfx(aud) {
  aud.currentTime = 0;
  aud.play().catch(() => {});
}
