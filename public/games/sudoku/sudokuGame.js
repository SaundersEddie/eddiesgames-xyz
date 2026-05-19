const boardEl = document.querySelector('#sudokuBoard');
const keypadEl = document.querySelector('#sudokuKeypad');

const timeEl = document.querySelector('#time');
const difficultyEl = document.querySelector('#dailyDifficulty');
const currentModeEl = document.querySelector('#currentMode');
const currentStateEl = document.querySelector('#currentState');
const etDateLabelEl = document.querySelector('#etDateLabel');

const btnDaily = document.querySelector('#btnDaily');
const btnEasy = document.querySelector('#btnEasy');
const btnMedium = document.querySelector('#btnMedium');
const btnHard = document.querySelector('#btnHard');
const btnNewGame = document.querySelector('#btnNewGame');
const btnClear = document.querySelector('#btnClear');
const btnNotes = document.querySelector('#btnNotes');

const LEVELS = {
  daily: {
    label: 'Daily',
    visibleMin: 5,
    visibleMax: 25,
  },
  easy: {
    label: 'Easy',
    visible: 40,
  },
  medium: {
    label: 'Medium',
    visible: 32,
  },
  hard: {
    label: 'Hard',
    visible: 26,
  },
};

let currentMode = 'daily';
let currentPuzzle = '';
let currentSolution = '';
let selectedIndex = null;
let cells = [];
let timerId = null;
let startedAt = null;
let timerRunning = false;
let devDailyRun = 0;
let notesMode = false;
let isSolved = false;
let currentVisibleCount = 0;
let currentPuzzleSeed = '';
let currentIsDevDaily = false;
let scoreSubmitted = false;

const cellNotes = new Map();

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

function shuffleArray(items, random) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function getEasternDateString() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date());
}

function pattern(row, col) {
  return (row * 3 + Math.floor(row / 3) + col) % 9;
}

function generateSolution(random) {
  const base = [0, 1, 2];

  const rows = shuffleArray(base, random).flatMap((group) => {
    return shuffleArray(base, random).map((row) => group * 3 + row);
  });

  const cols = shuffleArray(base, random).flatMap((group) => {
    return shuffleArray(base, random).map((col) => group * 3 + col);
  });

  const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9], random);

  let solution = '';

  for (const row of rows) {
    for (const col of cols) {
      solution += String(numbers[pattern(row, col)]);
    }
  }

  return solution;
}

function createPuzzle(solution, visibleCount, random) {
  const indexes = shuffleArray(
    Array.from({ length: 81 }, (_, index) => index),
    random,
  );

  const visibleIndexes = new Set(indexes.slice(0, visibleCount));

  return solution
    .split('')
    .map((value, index) => {
      return visibleIndexes.has(index) ? value : '.';
    })
    .join('');
}

function getVisibleCountForMode(mode, random) {
  const level = LEVELS[mode];

  if (mode === 'daily') {
    const range = level.visibleMax - level.visibleMin + 1;
    return level.visibleMin + Math.floor(random() * range);
  }

  return level.visible;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function resetTimerDisplay() {
  clearInterval(timerId);

  timerId = null;
  startedAt = null;
  timerRunning = false;

  if (timeEl) {
    timeEl.textContent = '00:00';
  }
}

function startTimerIfNeeded() {
  if (timerRunning) return;

  timerRunning = true;
  startedAt = Date.now();

  timerId = setInterval(() => {
    if (timeEl && startedAt !== null) {
      timeEl.textContent = formatTime(Date.now() - startedAt);
    }
  }, 250);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  timerRunning = false;
}

function setActiveButton(mode) {
  const buttons = [
    [btnDaily, 'daily'],
    [btnEasy, 'easy'],
    [btnMedium, 'medium'],
    [btnHard, 'hard'],
  ];

  buttons.forEach(([button, buttonMode]) => {
    if (!button) return;

    const isActive = buttonMode === mode;
    button.classList.toggle('ghost', !isActive);
  });
}

function updateLabels(mode, visibleCount, isDevDaily = false) {
  const level = LEVELS[mode];
  const easternDate = getEasternDateString();

  if (currentModeEl) {
    currentModeEl.textContent = mode === 'daily' ? 'Daily' : 'Free';
  }

  if (difficultyEl) {
    difficultyEl.textContent = level.label;
  }

  if (currentStateEl) {
    if (mode === 'daily') {
      currentStateEl.textContent = isDevDaily
        ? `Dev Daily ${devDailyRun} • ${visibleCount} clues`
        : `Daily Challenge • ${visibleCount} clues`;
    } else {
      currentStateEl.textContent = `${level.label} • ${visibleCount} clues`;
    }
  }

  if (etDateLabelEl) {
    etDateLabelEl.textContent = `ET date: ${easternDate}`;
  }
}

function buildBoard() {
  boardEl.innerHTML = '';

  for (let index = 0; index < 81; index += 1) {
    const button = document.createElement('button');
    const value = currentPuzzle[index];

    button.type = 'button';
    button.className = 'cell';
    button.dataset.index = String(index);

    if (value !== '.') {
      button.textContent = value;
      button.classList.add('given');
    }

    button.addEventListener('click', () => {
      selectCell(index);
    });

    boardEl.appendChild(button);
  }

  cells = Array.from(document.querySelectorAll('.cell'));
  updateUsedNumbers();
}

function buildKeypad() {
  keypadEl.innerHTML = '';

  for (let number = 1; number <= 9; number += 1) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'key';
    button.textContent = String(number);

    button.addEventListener('click', () => {
      setSelectedCellValue(String(number));
    });

    keypadEl.appendChild(button);
  }
}

function selectCell(index) {
  selectedIndex = index;

  cells.forEach((cell) => {
    cell.classList.remove('selected');
  });

  cells[index].classList.add('selected');
  updateHighlights();
}

function clearSelection() {
  selectedIndex = null;

  cells.forEach((cell) => {
    cell.classList.remove('selected', 'related', 'same-number');
  });
}

function moveSelection(rowDelta, colDelta) {
  if (cells.length === 0) return;

  if (selectedIndex === null) {
    selectCell(0);
    return;
  }

  const currentRow = Math.floor(selectedIndex / 9);
  const currentCol = selectedIndex % 9;

  const nextRow = Math.min(8, Math.max(0, currentRow + rowDelta));
  const nextCol = Math.min(8, Math.max(0, currentCol + colDelta));

  selectCell(nextRow * 9 + nextCol);
}

function updateHighlights() {
  cells.forEach((cell) => {
    cell.classList.remove('related', 'same-number');
  });

  if (selectedIndex === null) return;

  const selectedCell = cells[selectedIndex];
  const selectedValue = selectedCell.textContent.trim();

  const selectedRow = Math.floor(selectedIndex / 9);
  const selectedCol = selectedIndex % 9;
  const selectedBoxRow = Math.floor(selectedRow / 3);
  const selectedBoxCol = Math.floor(selectedCol / 3);

  cells.forEach((cell, index) => {
    if (index === selectedIndex) return;

    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);

    const isSameRow = row === selectedRow;
    const isSameCol = col === selectedCol;
    const isSameBox = boxRow === selectedBoxRow && boxCol === selectedBoxCol;

    if (isSameRow || isSameCol || isSameBox) {
      cell.classList.add('related');
    }

    if (selectedValue && cell.textContent.trim() === selectedValue) {
      cell.classList.add('same-number');
    }
  });
}

function setSelectedCellValue(value) {
    if (isSolved) return;
  if (selectedIndex === null) return;

  const cell = cells[selectedIndex];

  if (cell.classList.contains('given')) return;

  startTimerIfNeeded();

  if (notesMode) {
    toggleNote(selectedIndex, value);
    return;
  }

  cellNotes.delete(getCellNoteKey(selectedIndex));

  cell.innerHTML = '';
  cell.textContent = value;
  cell.classList.remove('wrong', 'correct');

  if (value === currentSolution[selectedIndex]) {
    cell.classList.add('correct');
  } else {
    cell.classList.add('wrong');
  }

  updateHighlights();
  updateUsedNumbers();
  checkSolvedSilently();
}

function clearSelectedCell() {
    if (isSolved) return;
  if (selectedIndex === null) return;

  const cell = cells[selectedIndex];

  if (cell.classList.contains('given')) return;

  cellNotes.delete(getCellNoteKey(selectedIndex));
  cell.innerHTML = '';
  cell.textContent = '';
  cell.classList.remove('wrong', 'correct');

  updateHighlights();
  updateUsedNumbers();
}

function checkBoard() {
  let complete = true;
  let mistakes = 0;

  cells.forEach((cell, index) => {
    if (cell.classList.contains('given')) return;

    const value = cell.textContent.trim();

    cell.classList.remove('wrong', 'correct');

    if (!value) {
      complete = false;
      return;
    }

    if (value === currentSolution[index]) {
      cell.classList.add('correct');
    } else {
      cell.classList.add('wrong');
      mistakes += 1;
    }
  });

  if (!currentStateEl) return;

    if (complete && mistakes === 0) {
    isSolved = true;
    cells.forEach((cell) => {
        cell.classList.add('locked');
    });
    currentStateEl.textContent = `Solved in ${timeEl.textContent}`;
    stopTimer();
    submitDailyScore();

    } else if (mistakes > 0) {
        currentStateEl.textContent = `${mistakes} mistake${mistakes === 1 ? '' : 's'} found`;
    } else {
        currentStateEl.textContent = 'Looks good so far';
    }
}

function checkSolvedSilently() {
    const filled = cells.every((cell) => {
        return cell.textContent.trim() !== '';
    });

    if (!filled) return;

    const solved = cells.every((cell, index) => {
        return cell.textContent.trim() === currentSolution[index];
    });

    if (!solved) return;

    isSolved = true;

    cells.forEach((cell) => {
        cell.classList.add('locked');
    });

    if (currentStateEl) {
        currentStateEl.textContent = `Solved in ${timeEl.textContent}`;
    }

    stopTimer();
    submitDailyScore();
}

function startGame(mode, options = {}) {
    currentMode = mode;
    selectedIndex = null;
    cellNotes.clear();
    notesMode = false;
    btnNotes?.classList.add('ghost');
    isSolved = false;

    currentIsDevDaily = options.devDaily === true;
    scoreSubmitted = false;

    const easternDate = getEasternDateString();

    const seed =
        mode === 'daily'
        ? currentIsDevDaily
            ? `sudoku-dev-daily-${easternDate}-${devDailyRun}`
            : `sudoku-daily-${easternDate}`
        : `sudoku-${mode}-${Date.now()}-${Math.random()}`;

    currentPuzzleSeed = seed;

    const random = createSeededRandom(seed);
    const visibleCount = getVisibleCountForMode(mode, random);
    currentVisibleCount = visibleCount;

    currentSolution = generateSolution(random);
    currentPuzzle = createPuzzle(currentSolution, visibleCount, random);

    setActiveButton(mode);
    updateLabels(mode, visibleCount, options.devDaily === true);
    buildBoard();
    resetTimerDisplay();
    if (mode === 'daily' && !currentIsDevDaily) {
        loadLeaderboard();
    }
}

function getCellNoteKey(index) {
    return String(index);
}

function renderNotes(cell, notes) {
    if (!notes || notes.size === 0) {
        cell.innerHTML = '';
        return;
  }

  const notesGrid = document.createElement('div');
  notesGrid.className = 'notesGrid';

  for (let number = 1; number <= 9; number += 1) {
        const note = document.createElement('span');
        note.textContent = notes.has(String(number)) ? String(number) : '';
        notesGrid.appendChild(note);
  }

  cell.innerHTML = '';
  cell.appendChild(notesGrid);
}

function toggleNote(index, value) {
  const cell = cells[index];

  if (!cell || cell.classList.contains('given')) return;
  if (cell.textContent.trim() && !cell.querySelector('.notesGrid')) return;

  const key = getCellNoteKey(index);
  const notes = cellNotes.get(key) ?? new Set();

  if (notes.has(value)) {
    notes.delete(value);
  } else {
    notes.add(value);
  }

  if (notes.size === 0) {
    cellNotes.delete(key);
  } else {
    cellNotes.set(key, notes);
  }

  cell.classList.remove('wrong', 'correct');
  renderNotes(cell, notes);
  updateHighlights();
}

function toggleNotesMode() {
  if (isSolved) return;

  notesMode = !notesMode;
  btnNotes?.classList.toggle('ghost', !notesMode);

  if (currentStateEl) {
    currentStateEl.textContent = notesMode ? 'Notes Mode' : 'Entry Mode';
  }
}

    function updateUsedNumbers() {
    if (!keypadEl) return;

    const counts = new Map();

    for (let number = 1; number <= 9; number += 1) {
        counts.set(String(number), 0);
    }

    cells.forEach((cell) => {
        if (cell.querySelector('.notesGrid')) return;

        const value = cell.textContent.trim();

        if (counts.has(value)) {
        counts.set(value, counts.get(value) + 1);
        }
    });

    function getElapsedMs() {
    if (!startedAt) return 0;
    return Date.now() - startedAt;
    }

    function formatLeaderboardTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
    }

    async function loadLeaderboard() {
    const leaderboardListEl = document.querySelector('#leaderboardList');
    const easternDate = getEasternDateString();

    if (!leaderboardListEl) return;

    try {
        const response = await fetch(`/api/sudoku/leaderboard?etDate=${easternDate}`);
        const data = await response.json();
        const scores = data.scores ?? [];

        if (scores.length === 0) {
        leaderboardListEl.innerHTML = `
            <li><span>No scores yet</span><span>#1</span></li>
            <li><span>—</span><span>#2</span></li>
            <li><span>—</span><span>#3</span></li>
        `;
        return;
        }

        leaderboardListEl.innerHTML = [0, 1, 2]
        .map((index) => {
            const score = scores[index];

            if (!score) {
            return `<li><span>—</span><span>#${index + 1}</span></li>`;
            }

            return `
            <li>
                <span>${formatLeaderboardTime(score.elapsed_ms)}</span>
                <span>#${index + 1}</span>
            </li>
            `;
        })
        .join('');
    } catch (error) {
        console.error('Failed to load Sudoku leaderboard:', error);

        leaderboardListEl.innerHTML = `
        <li><span>Leaderboard unavailable</span><span>#1</span></li>
        <li><span>—</span><span>#2</span></li>
        <li><span>—</span><span>#3</span></li>
        `;
    }
    }

    async function submitDailyScore() {
    if (scoreSubmitted) return;
    if (currentMode !== 'daily') return;
    if (currentIsDevDaily) return;

    scoreSubmitted = true;

    try {
        const response = await fetch('/api/sudoku/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            elapsedMs: Math.round(getElapsedMs()),
            clueCount: currentVisibleCount,
            puzzleSeed: currentPuzzleSeed,
        }),
        });

        const data = await response.json();

        if (!data.saved) {
        console.warn('Sudoku score was not saved:', data);
        return;
        }

        await loadLeaderboard();
    } catch (error) {
        console.error('Failed to submit Sudoku score:', error);
    }
    }

  const keys = Array.from(keypadEl.querySelectorAll('.key'));

  keys.forEach((key) => {
    const value = key.textContent.trim();
    const isUsedUp = counts.get(value) >= 9;

    key.classList.toggle('used-up', isUsedUp);
    key.disabled = isUsedUp;
    key.setAttribute(
      'aria-label',
      isUsedUp ? `${value} used up` : `Enter ${value}`,
    );
  });
}

btnDaily?.addEventListener('click', () => {
  startGame('daily');
});

btnEasy?.addEventListener('click', () => {
  startGame('easy');
});

btnMedium?.addEventListener('click', () => {
  startGame('medium');
});

btnHard?.addEventListener('click', () => {
  startGame('hard');
});

btnNewGame?.addEventListener('click', () => {
  startGame(currentMode);
});

// btnDevDaily?.addEventListener('click', () => {
//   devDailyRun += 1;
//   startGame('daily', { devDaily: true });
// });

btnClear?.addEventListener('click', clearSelectedCell);
// btnCheck?.addEventListener('click', checkBoard);

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (key === 'arrowup') {
    event.preventDefault();
    moveSelection(-1, 0);
    return;
  }

  if (key === 'arrowdown') {
    event.preventDefault();
    moveSelection(1, 0);
    return;
  }

  if (key === 'arrowleft') {
    event.preventDefault();
    moveSelection(0, -1);
    return;
  }

  if (key === 'arrowright') {
    event.preventDefault();
    moveSelection(0, 1);
    return;
  }

  if (key === 'n') {
    event.preventDefault();
    toggleNotesMode();
    return;
  }

  if (key === 'escape') {
    event.preventDefault();
    clearSelection();
    return;
  }

  if (event.key >= '1' && event.key <= '9') {
    event.preventDefault();
    setSelectedCellValue(event.key);
    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    clearSelectedCell();
  }
});

btnNotes?.addEventListener('click', toggleNotesMode);

if (!boardEl || !keypadEl) {
  console.error('Sudoku board or keypad container is missing.');
} else {
  buildKeypad();
  startGame('daily');
}
