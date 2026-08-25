const CELL_EMPTY = 0;
const CELL_TOKEN = 1;
const CELL_CROSS = 2;

const boardEl = document.getElementById('board');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const levelNumberEl = document.getElementById('levelNumber');
const howToBtn = document.getElementById('howToBtn');
const howToModal = document.getElementById('howToModal');
const closeHowToBtn = document.getElementById('closeHowToBtn');
const levelLabel = document.getElementById('levelLabel');

let level = null;
let cellStates = [];
let gameComplete = false;

async function loadLevel() {
  const url = new URL('./levels/level001.json', import.meta.url);

  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load level: ${response.status}`,
    );
  }

  level = await response.json();

  validateLevelData(level);

  cellStates = new Array(
    level.width * level.height,
  ).fill(CELL_EMPTY);

  updateLevelDisplay();

  renderBoard();
}

function validateLevelData(data) {
  if (!data) {
    throw new Error('Missing level data.');
  }

  if (
    !Number.isInteger(data.width) ||
    !Number.isInteger(data.height)
  ) {
    throw new Error('Invalid board size.');
  }

  const expected =
    data.width * data.height;

  if (
    !Array.isArray(data.regions) ||
    data.regions.length !== expected
  ) {
    throw new Error(
      `Expected ${expected} region entries.`,
    );
  }

  const regionCount =
    new Set(data.regions).size;

  if (regionCount !== data.width) {
    throw new Error(
      `Expected ${data.width} regions, found ${regionCount}.`,
    );
  }
}

function renderBoard() {
  boardEl.innerHTML = '';

  boardEl.style.setProperty(
    '--size',
    String(level.width),
  );

  for (
    let index = 0;
    index < level.regions.length;
    index++
  ) {
    const cell =
      document.createElement('button');

    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.index = String(index);

    applyRegionClasses(cell, index);
    updateCellVisual(cell, index);

    cell.addEventListener('click', () => {
      cycleCell(index);
    });

    boardEl.appendChild(cell);
  }
}

function cycleCell(index) {
  if (gameComplete) {
    return;
  }

  const current = cellStates[index];

  if (current === CELL_EMPTY) {
    tryPlaceToken(index);
    return;
  }

  if (current === CELL_TOKEN) {
    cellStates[index] = CELL_CROSS;
  } else {
    cellStates[index] = CELL_EMPTY;
  }

  refreshCell(index);

  statusEl.textContent =
    'Place one token in each row, column and region.';

  checkForWin();
}

function tryPlaceToken(index) {
  const violation =
    getPlacementViolation(index);

  if (violation) {
    statusEl.textContent = violation;
    flashInvalidCell(index);
    return;
  }

  cellStates[index] = CELL_TOKEN;

  refreshCell(index);

  statusEl.textContent =
    'Valid placement.';

  checkForWin();
}

function getPlacementViolation(index) {
  const row =
    Math.floor(index / level.width);

  const col =
    index % level.width;

  const region =
    level.regions[index];

  for (
    let other = 0;
    other < cellStates.length;
    other++
  ) {
    if (cellStates[other] !== CELL_TOKEN) {
      continue;
    }

    const otherRow =
      Math.floor(other / level.width);

    const otherCol =
      other % level.width;

    const otherRegion =
      level.regions[other];

    if (otherRow === row) {
      return 'That row already has a token.';
    }

    if (otherCol === col) {
      return 'That column already has a token.';
    }

    if (otherRegion === region) {
      return 'That region already has a token.';
    }

    const rowDistance =
      Math.abs(otherRow - row);

    const colDistance =
      Math.abs(otherCol - col);

    if (
      rowDistance <= 1 &&
      colDistance <= 1
    ) {
      return 'Tokens cannot touch.';
    }
  }

  return null;
}

function checkForWin() {
  const tokenIndexes = [];

  for (
    let index = 0;
    index < cellStates.length;
    index++
  ) {
    if (
      cellStates[index] === CELL_TOKEN
    ) {
      tokenIndexes.push(index);
    }
  }

  if (
    tokenIndexes.length !== level.width
  ) {
    return;
  }

  const rows = new Set();
  const cols = new Set();
  const regions = new Set();

  for (const index of tokenIndexes) {
    const row =
      Math.floor(index / level.width);

    const col =
      index % level.width;

    rows.add(row);
    cols.add(col);
    regions.add(level.regions[index]);
  }

  const required = level.width;

  if (
    rows.size === required &&
    cols.size === required &&
    regions.size === required
  ) {
    unlockPuzzle();
  }
}

function unlockPuzzle() {
  gameComplete = true;

  boardEl.classList.add('unlocked');

  statusEl.textContent =
    'UNLOCKED!';
}

function refreshCell(index) {
  const cell = boardEl.querySelector(
    `.cell[data-index="${index}"]`,
  );

  if (cell) {
    updateCellVisual(cell, index);
  }
}

function updateCellVisual(cell, index) {
  const state = cellStates[index];

  cell.classList.toggle(
    'token',
    state === CELL_TOKEN,
  );

  cell.classList.toggle(
    'cross',
    state === CELL_CROSS,
  );

  let stateName = 'empty';

  if (state === CELL_TOKEN) {
    stateName = 'token';
  } else if (state === CELL_CROSS) {
    stateName = 'marked impossible';
  }

  const row =
    Math.floor(index / level.width) + 1;

  const col =
    (index % level.width) + 1;

  cell.setAttribute(
    'aria-label',
    `Row ${row}, column ${col}, ${stateName}`,
  );
}

function flashInvalidCell(index) {
  const cell = boardEl.querySelector(
    `.cell[data-index="${index}"]`,
  );

  if (!cell) {
    return;
  }

  cell.classList.remove('invalid');

  void cell.offsetWidth;

  cell.classList.add('invalid');

  window.setTimeout(() => {
    cell.classList.remove('invalid');
  }, 300);
}

function applyRegionClasses(cell, index) {
  const region =
    level.regions[index];

  cell.classList.add(`region-${region}`);

  const row =
    Math.floor(index / level.width);

  const col =
    index % level.width;

  if (row > 0) {
    const above =
      index - level.width;

    if (
      level.regions[above] !== region
    ) {
      cell.classList.add(
        'border-top',
      );
    }
  }

  if (row < level.height - 1) {
    const below =
      index + level.width;

    if (
      level.regions[below] !== region
    ) {
      cell.classList.add(
        'border-bottom',
      );
    }
  }

  if (col > 0) {
    const left =
      index - 1;

    if (
      level.regions[left] !== region
    ) {
      cell.classList.add(
        'border-left',
      );
    }
  }

  if (col < level.width - 1) {
    const right =
      index + 1;

    if (
      level.regions[right] !== region
    ) {
      cell.classList.add(
        'border-right',
      );
    }
  }
}

function resetBoard() {
  cellStates.fill(CELL_EMPTY);

  gameComplete = false;

  boardEl.classList.remove(
    'unlocked',
  );

  renderBoard();

  statusEl.textContent =
    'Board reset.';
}

resetBtn.addEventListener(
  'click',
  resetBoard,
);

function openHowTo() {
  howToModal.classList.remove('hidden');
}

function closeHowTo() {
  howToModal.classList.add('hidden');
}

howToBtn.addEventListener('click', openHowTo);

closeHowToBtn.addEventListener('click', closeHowTo);

howToModal.addEventListener('click', (event) => {
  if (event.target === howToModal) {
    closeHowTo();
  }
});

document.addEventListener('keydown', (event) => {
  if (
    event.key === 'Escape' &&
    !howToModal.classList.contains('hidden')
  ) {
    closeHowTo();
  }
});

loadLevel().catch((error) => {
  console.error(error);

  statusEl.textContent =
    'Could not load puzzle.';
});

function updateLevelDisplay() {
  if (level.mode === 'daily') {
    levelLabel.textContent = 'Mode';
    levelNumberEl.textContent = 'Daily';
  } else {
    levelLabel.textContent = 'Level';
    levelNumberEl.textContent = String(level.number ?? level.id);
  }
}

