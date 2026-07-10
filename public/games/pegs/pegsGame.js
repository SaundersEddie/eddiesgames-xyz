const boardEl = document.querySelector('#pegsBoard');
const currentModeEl = document.querySelector('#currentMode');
const currentShapeEl = document.querySelector('#currentShape');
const pegCountEl = document.querySelector('#pegCount');
const moveCountEl = document.querySelector('#moveCount');
const timeEl = document.querySelector('#time');
const currentStateEl = document.querySelector('#currentState');
const gameHintEl = document.querySelector('#gameHint');
const etDateLabelEl = document.querySelector('#etDateLabel');
const leaderboardListEl = document.querySelector('#leaderboardList');

const btnDaily = document.querySelector('#btnDaily');
const btnRandom = document.querySelector('#btnRandom');
const btnUndo = document.querySelector('#btnUndo');
const btnRestart = document.querySelector('#btnRestart');
const btnHowToPlay = document.querySelector('#btnHowToPlay');
const btnHowToClose = document.querySelector('#btnHowToClose');

const resultOverlay = document.querySelector('#resultOverlay');
const resultLabel = document.querySelector('#resultLabel');
const resultTitle = document.querySelector('#resultTitle');
const resultSummary = document.querySelector('#resultSummary');
const btnResultClose = document.querySelector('#btnResultClose');
const btnResultNewGame = document.querySelector('#btnResultNewGame');
const btnShare = document.querySelector('#btnShare');
const howToPlayOverlay = document.querySelector('#howToPlayOverlay');

const TRIANGLE_ROWS = 5;

function buildTriangleHoles(rows) {
  const holes = [];
  let id = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      holes.push({
        id,
        row,
        col,
        x: 50 + (col - row / 2) * 19,
        y: 13 + row * 18.2,
      });
      id += 1;
    }
  }

  return holes;
}

function buildJumpsFromGrid(holes) {
  const byCoordinate = new Map(
    holes.map((hole) => [`${hole.row},${hole.col}`, hole.id]),
  );

  const directions = [
    [-1, -1],
    [-1, 0],
    [0, -1],
    [0, 1],
    [1, 0],
    [1, 1],
  ];

  const jumps = [];

  for (const hole of holes) {
    for (const [rowDelta, colDelta] of directions) {
      const over = byCoordinate.get(
        `${hole.row + rowDelta},${hole.col + colDelta}`,
      );
      const to = byCoordinate.get(
        `${hole.row + rowDelta * 2},${hole.col + colDelta * 2}`,
      );

      if (over !== undefined && to !== undefined) {
        jumps.push({ from: hole.id, over, to });
      }
    }
  }

  return jumps;
}

const triangleHoles = buildTriangleHoles(TRIANGLE_ROWS);

const BOARD_DEFINITIONS = {
  'triangle-15': {
    id: 'triangle-15',
    name: 'Classic Triangle',
    holes: triangleHoles,
    jumps: buildJumpsFromGrid(triangleHoles),
    startingEmptyHoles: triangleHoles.map((hole) => hole.id),
  },
};

let currentMode = 'daily';
let currentBoardId = 'triangle-15';
let occupied = new Set();
let selectedHoleId = null;
let availableDestinations = new Map();
let undoStack = [];
let moveCount = 0;
let startingEmptyHole = 0;
let timerId = null;
let startedAt = null;
let elapsedBeforeStart = 0;
let timerRunning = false;
let gameOver = false;
let scoreSubmitted = false;
let finalElapsedMs = 0;

function createSeededRandom(seedText) {
  let seed = 2166136261;

  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return function random() {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getEasternDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getCurrentBoard() {
  return BOARD_DEFINITIONS[currentBoardId];
}

function getPegCount() {
  return occupied.size;
}

function getElapsedMs() {
  if (!startedAt) return elapsedBeforeStart;
  return elapsedBeforeStart + (Date.now() - startedAt);
}

function startTimerIfNeeded() {
  if (timerRunning || gameOver) return;

  timerRunning = true;
  startedAt = Date.now();

  timerId = window.setInterval(() => {
    timeEl.textContent = formatTime(getElapsedMs());
  }, 250);
}

function stopTimer() {
  if (timerRunning && startedAt) {
    elapsedBeforeStart += Date.now() - startedAt;
  }

  window.clearInterval(timerId);
  timerId = null;
  startedAt = null;
  timerRunning = false;
}

function resetTimer() {
  window.clearInterval(timerId);
  timerId = null;
  startedAt = null;
  elapsedBeforeStart = 0;
  timerRunning = false;
  timeEl.textContent = '00:00';
}

function chooseStartingHole(mode, board) {
  const options = board.startingEmptyHoles;

  if (mode === 'daily') {
    const random = createSeededRandom(
      `${getEasternDateString()}|${board.id}|pegs`,
    );
    return options[Math.floor(random() * options.length)];
  }

  return options[Math.floor(Math.random() * options.length)];
}

function setActiveModeButton() {
  btnDaily.classList.toggle('ghost', currentMode !== 'daily');
  btnRandom.classList.toggle('ghost', currentMode !== 'random');
}

function initializeGame(mode = currentMode, preserveStart = false) {
  stopTimer();
  resetTimer();

  currentMode = mode;
  const board = getCurrentBoard();

  if (!preserveStart) {
    startingEmptyHole = chooseStartingHole(mode, board);
  }

  occupied = new Set(board.holes.map((hole) => hole.id));
  occupied.delete(startingEmptyHole);

  selectedHoleId = null;
  availableDestinations = new Map();
  undoStack = [];
  moveCount = 0;
  gameOver = false;
  scoreSubmitted = false;
  finalElapsedMs = 0;

  setActiveModeButton();
  closeResult();
  renderBoard();
  updateHud();

  currentStateEl.textContent =
    currentMode === 'daily'
      ? 'Daily Challenge'
      : 'Random Free Play';

  gameHintEl.textContent =
    'Select a peg, then select an empty hole two spaces away.';

  if (currentMode === 'daily') {
    loadLeaderboard();
  }
}

function getValidMovesFrom(holeId) {
  const board = getCurrentBoard();

  return board.jumps.filter((jump) => {
    return (
      jump.from === holeId &&
      occupied.has(jump.from) &&
      occupied.has(jump.over) &&
      !occupied.has(jump.to)
    );
  });
}

function getAllValidMoves() {
  const board = getCurrentBoard();

  return board.jumps.filter((jump) => {
    return (
      occupied.has(jump.from) &&
      occupied.has(jump.over) &&
      !occupied.has(jump.to)
    );
  });
}

function selectHole(holeId) {
  if (gameOver) return;

  if (selectedHoleId !== null && availableDestinations.has(holeId)) {
    makeMove(availableDestinations.get(holeId));
    return;
  }

  if (!occupied.has(holeId)) {
    clearSelection();
    gameHintEl.textContent = 'That hole is empty. Select a peg first.';
    return;
  }

  const moves = getValidMovesFrom(holeId);

  if (moves.length === 0) {
    clearSelection();
    gameHintEl.textContent = 'That peg has no legal jump.';
    return;
  }

  selectedHoleId = holeId;
  availableDestinations = new Map(moves.map((move) => [move.to, move]));

  gameHintEl.textContent =
    moves.length === 1
      ? 'One legal destination is highlighted.'
      : `${moves.length} legal destinations are highlighted.`;

  renderBoard();
}

function clearSelection() {
  selectedHoleId = null;
  availableDestinations = new Map();
  renderBoard();
}

function makeMove(move) {
  startTimerIfNeeded();

  undoStack.push(new Set(occupied));

  occupied.delete(move.from);
  occupied.delete(move.over);
  occupied.add(move.to);

  moveCount += 1;
  selectedHoleId = null;
  availableDestinations = new Map();

  renderBoard();
  updateHud();

  if (getAllValidMoves().length === 0) {
    finishGame();
  } else {
    gameHintEl.textContent = 'Good jump. Keep going.';
  }
}

function undoMove() {
  if (gameOver || undoStack.length === 0) return;

  occupied = undoStack.pop();

  // Deliberately do not change moveCount or the timer.
  selectedHoleId = null;
  availableDestinations = new Map();

  renderBoard();
  updateHud();
  gameHintEl.textContent =
    'Board restored. The move still counts against your score.';
}

function renderBoard() {
  const board = getCurrentBoard();
  boardEl.innerHTML = '';

  for (const hole of board.holes) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'hole';
    button.style.left = `${hole.x}%`;
    button.style.top = `${hole.y}%`;
    button.dataset.holeId = String(hole.id);
    button.setAttribute('role', 'gridcell');
    button.setAttribute(
      'aria-label',
      occupied.has(hole.id) ? `Peg ${hole.id + 1}` : `Empty hole ${hole.id + 1}`,
    );

    if (occupied.has(hole.id)) {
      button.classList.add('occupied');
    }

    if (selectedHoleId === hole.id) {
      button.classList.add('selected');
    }

    if (availableDestinations.has(hole.id)) {
      button.classList.add('destination');
    }

    button.addEventListener('click', () => selectHole(hole.id));
    boardEl.appendChild(button);
  }
}

function updateHud() {
  const board = getCurrentBoard();

  currentModeEl.textContent = currentMode === 'daily' ? 'Daily' : 'Random';
  currentShapeEl.textContent = board.name;
  pegCountEl.textContent = String(getPegCount());
  moveCountEl.textContent = String(moveCount);
  btnUndo.disabled = undoStack.length === 0 || gameOver;
  etDateLabelEl.textContent = `ET date: ${getEasternDateString()}`;
}

async function finishGame() {
  gameOver = true;
  stopTimer();
  finalElapsedMs = Math.max(1, getElapsedMs());

  const pegsRemaining = getPegCount();
  const perfect = pegsRemaining === 1;

  resultLabel.textContent = perfect ? 'Perfect Game' : 'No More Moves';
  resultTitle.textContent = perfect ? 'One Peg Left' : 'Run Complete';
  resultSummary.textContent =
    `${pegsRemaining} peg${pegsRemaining === 1 ? '' : 's'} remaining • ` +
    `${moveCount} moves • ${formatTime(finalElapsedMs)}`;

  resultOverlay.classList.remove('hidden');
  updateHud();

  if (currentMode === 'daily') {
    await submitScore();
    await loadLeaderboard();
  }
}

function closeResult() {
  resultOverlay.classList.add('hidden');
}

async function submitScore() {
  if (scoreSubmitted || currentMode !== 'daily') return;

  scoreSubmitted = true;

  try {
    const response = await fetch('/api/pegs/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId: currentBoardId,
        pegsRemaining: getPegCount(),
        moves: moveCount,
        elapsedMs: finalElapsedMs,
        startingEmptyHole,
      }),
    });

    if (!response.ok) {
      throw new Error(`Score submit failed: ${response.status}`);
    }
  } catch (error) {
    console.error(error);
    scoreSubmitted = false;
  }
}

async function loadLeaderboard() {
  const etDate = getEasternDateString();
  etDateLabelEl.textContent = `ET date: ${etDate}`;

  try {
    const response = await fetch(
      `/api/pegs/leaderboard?etDate=${encodeURIComponent(etDate)}&boardId=${encodeURIComponent(currentBoardId)}`,
    );

    if (!response.ok) {
      throw new Error(`Leaderboard failed: ${response.status}`);
    }

    const data = await response.json();
    const scores = Array.isArray(data.scores) ? data.scores : [];

    leaderboardListEl.innerHTML = '';

    for (let index = 0; index < 3; index += 1) {
      const item = document.createElement('li');
      const score = scores[index];

      if (score) {
        const description =
          `${score.pegs_remaining} peg${score.pegs_remaining === 1 ? '' : 's'} • ` +
          `${score.moves} moves • ${formatTime(score.elapsed_ms)}`;

        item.innerHTML = `<span>${description}</span><span>#${index + 1}</span>`;
      } else {
        item.innerHTML = `<span>—</span><span>#${index + 1}</span>`;
      }

      leaderboardListEl.appendChild(item);
    }
  } catch (error) {
    console.error(error);
  }
}

async function copyScore() {
  const modeLabel = currentMode === 'daily' ? 'DAILY' : 'RANDOM';
  const pegsRemaining = getPegCount();

  const text = [
    `PEGS • ${modeLabel}`,
    `${pegsRemaining === 1 ? '🏆' : '🔸'} ${pegsRemaining} peg${pegsRemaining === 1 ? '' : 's'} left`,
    `🎯 ${moveCount} moves`,
    `⏱️ ${formatTime(finalElapsedMs)}`,
    'https://eddiesgames.xyz',
  ].join('\n');

  try {
    await navigator.clipboard.writeText(text);
    btnShare.textContent = 'Copied!';
    window.setTimeout(() => {
      btnShare.textContent = 'Copy Score';
    }, 1400);
  } catch (error) {
    console.error(error);
    btnShare.textContent = 'Copy Failed';
  }
}

btnDaily.addEventListener('click', () => initializeGame('daily'));
btnRandom.addEventListener('click', () => initializeGame('random'));
btnUndo.addEventListener('click', undoMove);
btnRestart.addEventListener('click', () =>
  initializeGame(currentMode, true),
);

btnHowToPlay.addEventListener('click', () => {
  howToPlayOverlay.classList.remove('hidden');
});

btnHowToClose.addEventListener('click', () => {
  howToPlayOverlay.classList.add('hidden');
});

btnResultClose.addEventListener('click', closeResult);
btnResultNewGame.addEventListener('click', () => initializeGame(currentMode));
btnShare.addEventListener('click', copyScore);

howToPlayOverlay.addEventListener('click', (event) => {
  if (event.target === howToPlayOverlay) {
    howToPlayOverlay.classList.add('hidden');
  }
});

resultOverlay.addEventListener('click', (event) => {
  if (event.target === resultOverlay) {
    closeResult();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    howToPlayOverlay.classList.add('hidden');
    closeResult();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undoMove();
  }
});

initializeGame('daily');
