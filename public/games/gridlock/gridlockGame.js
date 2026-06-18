import {
  getEtDateKey,
  loadTop3,
  submitScore,
  formatTimeMs,
} from './gridlockLeaderboard.js';

const FRONT_PAGE_URL = 'https://eddiesgames.xyz';
const LS_MODE = 'gridlock:mode';
const LS_PUZZLE = 'gridlock:puzzle';

const $ = (sel) => document.querySelector(sel);

const boardEl = $('#board');
const timeEl = $('#time');
const movesEl = $('#moves');
const puzzleLabelEl = $('#puzzleLabel');
const toastEl = $('#toast');

const modeSelect = $('#modeSelect');
const restartBtn = $('#restartBtn');
const newPuzzleBtn = $('#newPuzzleBtn');

const modal = $('#modal');
const finalTimeEl = $('#finalTime');
const finalMovesEl = $('#finalMoves');
const playAgainBtn = $('#playAgainBtn');
const closeModalBtn = $('#closeModalBtn');
const copyShareBtn = $('#copyShareBtn');
const copyShareHint = $('#copyShareHint');

const howToBtn = $('#howToBtn');
const howToModal = $('#howToModal');
const closeHowToBtn = $('#closeHowToBtn');

const lbDateEl = $('#lbDate');
const lbEasyEl = $('#lbEasy');
const lbMediumEl = $('#lbMedium');
const lbHardEl = $('#lbHard');

const PUZZLES = {
  easy: [
    {
      size: 5,
      exitRow: 2,
      note: 'Move C down, then slide X right.',
      blocks: [
        { id: 'X', row: 2, col: 0, w: 2, h: 1, type: 'target' },
        { id: 'A', row: 0, col: 0, w: 1, h: 2 },
        { id: 'B', row: 0, col: 1, w: 2, h: 1 },
        { id: 'C', row: 1, col: 2, w: 1, h: 2 },
        { id: 'D', row: 3, col: 0, w: 2, h: 1 },
        { id: 'E', row: 4, col: 2, w: 2, h: 1 },
      ],
    },
    {
      size: 5,
      exitRow: 2,
      note: 'Clear the lane, then slide X out.',
      blocks: [
        { id: 'X', row: 2, col: 1, w: 2, h: 1, type: 'target' },
        { id: 'A', row: 0, col: 0, w: 1, h: 2 },
        { id: 'B', row: 0, col: 1, w: 2, h: 1 },
        { id: 'C', row: 1, col: 3, w: 1, h: 2 },
        { id: 'D', row: 3, col: 2, w: 1, h: 2 },
        { id: 'E', row: 4, col: 0, w: 2, h: 1 },
      ],
    },
  ],

  medium: [
    {
      size: 6,
      exitRow: 2,
      note: 'Move the vertical blockers away from row 3.',
      blocks: [
        { id: 'X', row: 2, col: 0, w: 2, h: 1, type: 'target' },
        { id: 'A', row: 0, col: 0, w: 1, h: 2 },
        { id: 'B', row: 0, col: 1, w: 2, h: 1 },
        { id: 'C', row: 1, col: 2, w: 1, h: 2 },
        { id: 'D', row: 0, col: 4, w: 1, h: 3 },
        { id: 'E', row: 3, col: 0, w: 2, h: 1 },
        { id: 'F', row: 4, col: 2, w: 2, h: 1 },
        { id: 'G', row: 5, col: 3, w: 3, h: 1 },
      ],
    },
    {
      size: 6,
      exitRow: 2,
      note: 'Open the exit lane from left to right.',
      blocks: [
        { id: 'X', row: 2, col: 1, w: 2, h: 1, type: 'target' },
        { id: 'A', row: 0, col: 0, w: 1, h: 3 },
        { id: 'B', row: 0, col: 1, w: 2, h: 1 },
        { id: 'C', row: 0, col: 3, w: 1, h: 2 },
        { id: 'D', row: 1, col: 4, w: 1, h: 2 },
        { id: 'E', row: 3, col: 1, w: 2, h: 1 },
        { id: 'F', row: 3, col: 3, w: 1, h: 3 },
        { id: 'G', row: 5, col: 4, w: 2, h: 1 },
      ],
    },
  ],

  hard: [
    {
      size: 6,
      exitRow: 2,
      note: 'Hard mode is still hand-built. Expect blocker shuffling.',
      blocks: [
        { id: 'X', row: 2, col: 0, w: 2, h: 1, type: 'target' },
        { id: 'A', row: 0, col: 0, w: 2, h: 1 },
        { id: 'B', row: 0, col: 2, w: 1, h: 3 },
        { id: 'C', row: 0, col: 3, w: 2, h: 1 },
        { id: 'D', row: 0, col: 5, w: 1, h: 2 },
        { id: 'E', row: 1, col: 0, w: 1, h: 2 },
        { id: 'F', row: 1, col: 3, w: 1, h: 3 },
        { id: 'G', row: 3, col: 1, w: 2, h: 1 },
        { id: 'H', row: 3, col: 4, w: 1, h: 3 },
        { id: 'I', row: 4, col: 0, w: 3, h: 1 },
        { id: 'J', row: 5, col: 1, w: 2, h: 1 },
      ],
    },
    {
      size: 6,
      exitRow: 2,
      note: 'The target escapes by sliding fully through the right edge.',
      blocks: [
        { id: 'X', row: 2, col: 1, w: 2, h: 1, type: 'target' },
        { id: 'A', row: 0, col: 0, w: 1, h: 3 },
        { id: 'B', row: 0, col: 1, w: 2, h: 1 },
        { id: 'C', row: 0, col: 3, w: 1, h: 2 },
        { id: 'D', row: 0, col: 4, w: 2, h: 1 },
        { id: 'E', row: 1, col: 5, w: 1, h: 3 },
        { id: 'F', row: 3, col: 1, w: 1, h: 3 },
        { id: 'G', row: 3, col: 2, w: 2, h: 1 },
        { id: 'H', row: 4, col: 3, w: 3, h: 1 },
        { id: 'I', row: 5, col: 4, w: 2, h: 1 },
      ],
    },
  ],
};

let state = null;

init();

function init() {
  const savedMode = localStorage.getItem(LS_MODE);
  if (savedMode && PUZZLES[savedMode]) modeSelect.value = savedMode;

  modeSelect.addEventListener('change', () => {
    localStorage.setItem(LS_MODE, modeSelect.value);
    localStorage.setItem(LS_PUZZLE, '0');
    startGame({ puzzleIndex: 0 });
  });

  restartBtn.addEventListener('click', () => {
    startGame({ puzzleIndex: state?.puzzleIndex ?? 0 });
  });

  newPuzzleBtn.addEventListener('click', () => {
    const mode = modeSelect.value;
    const next = ((state?.puzzleIndex ?? 0) + 1) % PUZZLES[mode].length;
    localStorage.setItem(LS_PUZZLE, String(next));
    startGame({ puzzleIndex: next });
  });

  playAgainBtn.addEventListener('click', () => {
    hideModal();
    startGame({ puzzleIndex: state?.puzzleIndex ?? 0 });
  });

  closeModalBtn.addEventListener('click', hideModal);

  howToBtn.addEventListener('click', () => {
    howToModal.classList.remove('hidden');
  });

  closeHowToBtn.addEventListener('click', () => {
    howToModal.classList.add('hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  howToModal.addEventListener('click', (e) => {
    if (e.target === howToModal) howToModal.classList.add('hidden');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
      howToModal.classList.add('hidden');
    }
  });

  copyShareBtn.addEventListener('click', async () => {
    if (!state?.shareText) return;

    const ok = await copyTextToClipboard(state.shareText);
    copyShareHint.textContent = ok ? 'Copied!' : 'Copy failed';
  });

  const savedPuzzle = Number(localStorage.getItem(LS_PUZZLE) || 0);
  startGame({ puzzleIndex: Number.isFinite(savedPuzzle) ? savedPuzzle : 0 });
  renderLeaderboards();
}

function startGame({ puzzleIndex = 0 } = {}) {
  if (state?.timerRaf) cancelAnimationFrame(state.timerRaf);

  hideModal();
  toast('');

  const mode = modeSelect.value;
  const puzzleList = PUZZLES[mode];
  const safeIndex =
    ((puzzleIndex % puzzleList.length) + puzzleList.length) % puzzleList.length;
  const puzzle = clonePuzzle(puzzleList[safeIndex]);

  state = {
    mode,
    puzzleIndex: safeIndex,
    puzzle,
    blocks: puzzle.blocks,
    selectedId: null,
    moves: 0,
    firstMoveAt: null,
    endAt: null,
    timerRaf: null,
    locked: false,
    shareText: '',
  };

  boardEl.style.setProperty('--size', String(puzzle.size));
  boardEl.style.setProperty('--exit-row', String(puzzle.exitRow));
  boardEl.dataset.size = String(puzzle.size);

  puzzleLabelEl.textContent = `${safeIndex + 1}/${puzzleList.length}`;
  movesEl.textContent = '0';
  timeEl.textContent = '00:00.000';

  renderBoard();
}

function clonePuzzle(puzzle) {
  return JSON.parse(JSON.stringify(puzzle));
}

function renderBoard() {
  const { size } = state.puzzle;

  boardEl.innerHTML = '';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.setAttribute('aria-label', `Cell ${r + 1}, ${c + 1}`);
      cell.addEventListener('click', () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }

  const exit = document.createElement('button');
  exit.type = 'button';
  exit.className = 'exitGate';
  exit.textContent = 'EXIT';
  exit.setAttribute('aria-label', 'Exit');
  exit.addEventListener('click', () => onExitClick());
  boardEl.appendChild(exit);

  for (const block of state.blocks) {
    if (block.type === 'target' && targetHasEscaped(block)) continue;

    const el = document.createElement('button');
    el.type = 'button';
    el.className = `block ${block.type === 'target' ? 'target' : ''}`;
    el.dataset.id = block.id;
    el.textContent = block.id;

    el.style.gridColumn = `${block.col + 1} / span ${block.w}`;
    el.style.gridRow = `${block.row + 1} / span ${block.h}`;

    el.setAttribute(
      'aria-label',
      `${block.type === 'target' ? 'Target' : 'Block'} ${block.id}`,
    );

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onBlockClick(block.id);
    });

    if (state.selectedId === block.id) el.classList.add('selected');

    boardEl.appendChild(el);
  }

  renderMoveHints();
}

function onBlockClick(blockId) {
  if (state.locked) return;

  state.selectedId = state.selectedId === blockId ? null : blockId;
  renderBoard();
}

function onCellClick(row, col) {
  if (state.locked || !state.selectedId) return;

  const block = getBlock(state.selectedId);
  if (!block) return;

  const move = getMoveToCell(block, row, col);

  if (!move) {
    toast('That block cannot move there.');
    return;
  }

  applyMove(block, move);
}

function getMoveToCell(block, row, col) {
  const orientation = getOrientation(block);
  const size = state.puzzle.size;

  if (orientation === 'horizontal') {
    if (row < block.row || row >= block.row + block.h) return null;

    if (col < block.col) {
      const steps = block.col - col;
      return canMove(block, 'left', steps) ? { dir: 'left', steps } : null;
    }

    if (col >= block.col + block.w) {
      let steps = col - (block.col + block.w) + 1;

      // For the target block, clicking the last cell in the exit row means
      // "escape through the exit", not merely "move to the board edge".
      if (
        block.type === 'target' &&
        block.row === state.puzzle.exitRow &&
        col === size - 1
      ) {
        steps = size - block.col - block.w + 1;
      }

      return canMove(block, 'right', steps) ? { dir: 'right', steps } : null;
    }
  }

  if (orientation === 'vertical') {
    if (col < block.col || col >= block.col + block.w) return null;

    if (row < block.row) {
      const steps = block.row - row;
      return canMove(block, 'up', steps) ? { dir: 'up', steps } : null;
    }

    if (row >= block.row + block.h) {
      const steps = row - (block.row + block.h) + 1;
      return canMove(block, 'down', steps) ? { dir: 'down', steps } : null;
    }
  }

  return null;
}

function onExitClick() {
  if (state.locked || !state.selectedId) return;

  const block = getBlock(state.selectedId);
  if (!block || block.type !== 'target') {
    toast('Select the orange X first.');
    return;
  }

  if (block.row !== state.puzzle.exitRow) {
    toast('The orange X must line up with the exit.');
    return;
  }

  const steps = state.puzzle.size - block.col - block.w + 1;

  if (!canMove(block, 'right', steps)) {
    toast('The exit path is still blocked.');
    return;
  }

  applyMove(block, { dir: 'right', steps });
}

function canMove(block, dir, steps) {
  if (steps <= 0) return false;

  const size = state.puzzle.size;

  for (let i = 1; i <= steps; i++) {
    let testRow = block.row;
    let testCol = block.col;

    if (dir === 'left') testCol -= i;
    if (dir === 'right') testCol += i;
    if (dir === 'up') testRow -= i;
    if (dir === 'down') testRow += i;

    const testBlock = { ...block, row: testRow, col: testCol };

    if (testBlock.row < 0) return false;
    if (testBlock.col < 0) return false;
    if (testBlock.row + testBlock.h > size) return false;

    if (testBlock.col + testBlock.w > size) {
      const escapeCol = size - block.w + 1;

      const isEscaping =
        block.type === 'target' &&
        dir === 'right' &&
        block.row === state.puzzle.exitRow &&
        testBlock.col === escapeCol;

      if (!isEscaping) return false;
    }

    if (collides(testBlock, block.id)) return false;
  }

  return true;
}

function applyMove(block, move) {
  if (!state.firstMoveAt) {
    state.firstMoveAt = performance.now();
    tickTimer();
  }

  if (move.dir === 'left') block.col -= move.steps;
  if (move.dir === 'right') block.col += move.steps;
  if (move.dir === 'up') block.row -= move.steps;
  if (move.dir === 'down') block.row += move.steps;

  state.moves++;
  movesEl.textContent = String(state.moves);
  state.selectedId = null;

  if (block.type === 'target' && targetHasEscaped(block)) {
    finishGame();
    return;
  }

  renderBoard();
}

function targetHasEscaped(block) {
  return (
    block.type === 'target' &&
    block.row === state.puzzle.exitRow &&
    block.col + block.w > state.puzzle.size
  );
}

function renderMoveHints() {
  if (!state.selectedId) return;

  const block = getBlock(state.selectedId);
  if (!block) return;

  const hints = getPossibleDestinationCells(block);

  for (const hint of hints) {
    const cell = boardEl.querySelector(
      `.cell[data-row="${hint.row}"][data-col="${hint.col}"]`,
    );

    if (cell) {
      cell.classList.add('hintCell');
      cell.dataset.dir = hint.dir;
      cell.setAttribute('aria-label', `Move ${hint.dir}`);
    }
  }
}

function getPossibleDestinationCells(block) {
  const hints = [];
  const orientation = getOrientation(block);
  const size = state.puzzle.size;
  const maxSteps = size + 1;

  if (orientation === 'horizontal') {
    for (
      let steps = 1;
      steps <= maxSteps && canMove(block, 'left', steps);
      steps++
    ) {
      hints.push({ row: block.row, col: block.col - steps, dir: 'left' });
    }

    for (
      let steps = 1;
      steps <= maxSteps && canMove(block, 'right', steps);
      steps++
    ) {
      const col = Math.min(size - 1, block.col + block.w + steps - 1);
      hints.push({ row: block.row, col, dir: 'right' });

      if (block.type === 'target' && block.col + block.w + steps > size) {
        break;
      }
    }
  }

  if (orientation === 'vertical') {
    for (
      let steps = 1;
      steps <= maxSteps && canMove(block, 'up', steps);
      steps++
    ) {
      hints.push({ row: block.row - steps, col: block.col, dir: 'up' });
    }

    for (
      let steps = 1;
      steps <= maxSteps && canMove(block, 'down', steps);
      steps++
    ) {
      hints.push({
        row: block.row + block.h + steps - 1,
        col: block.col,
        dir: 'down',
      });
    }
  }

  return hints;
}

function collides(testBlock, ignoreId) {
  for (const other of state.blocks) {
    if (other.id === ignoreId) continue;

    const separated =
      testBlock.col + testBlock.w <= other.col ||
      other.col + other.w <= testBlock.col ||
      testBlock.row + testBlock.h <= other.row ||
      other.row + other.h <= testBlock.row;

    if (!separated) return true;
  }

  return false;
}

function getBlock(id) {
  return state.blocks.find((b) => b.id === id);
}

function getOrientation(block) {
  if (block.w > block.h) return 'horizontal';
  if (block.h > block.w) return 'vertical';
  return 'single';
}

function finishGame() {
  state.locked = true;
  state.endAt = performance.now();

  if (state.timerRaf) cancelAnimationFrame(state.timerRaf);

  const elapsed = state.firstMoveAt ? state.endAt - state.firstMoveAt : 0;

  const result = submitScore({
    mode: state.mode,
    timeMs: Math.floor(elapsed),
    moves: state.moves,
    completedAt: Date.now(),
  });

  finalTimeEl.textContent = formatTimeMs(elapsed);
  finalMovesEl.textContent = String(state.moves);

  state.shareText = buildShareText({
    mode: state.mode,
    timeMs: Math.floor(elapsed),
    moves: state.moves,
  });

  renderLeaderboards(result.etDate);
  showModal();
}

function tickTimer() {
  if (!state || !state.firstMoveAt || state.locked) return;

  const elapsed = performance.now() - state.firstMoveAt;
  timeEl.textContent = formatTimeMs(elapsed);

  state.timerRaf = requestAnimationFrame(tickTimer);
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
    li.innerHTML = `<span class="muted">No escapes yet</span>`;
    ol.appendChild(li);
    return;
  }

  for (const e of entries) {
    const li = document.createElement('li');
    li.textContent = `${e.moves} moves • ${formatTimeMs(e.timeMs)}`;
    ol.appendChild(li);
  }
}

function buildShareText({ mode, timeMs, moves }) {
  const label = mode.charAt(0).toUpperCase() + mode.slice(1);
  const cleanTime = formatTimeMs(timeMs).split('.')[0];

  return `🏆 GRIDLOCK • ${label}
🚪 Escaped in ${moves} moves
⏱ ${cleanTime}

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
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function showModal() {
  copyShareHint.textContent = '';
  modal.classList.remove('hidden');
}

function hideModal() {
  modal.classList.add('hidden');
}

function toast(msg) {
  toastEl.textContent = msg;

  if (!msg) return;

  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toastEl.textContent = '';
  }, 1400);
}
