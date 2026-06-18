(() => {
  const $ = (sel) => document.querySelector(sel);

  const modeLabelEl = $('#modeLabel');
  const seedLabelEl = $('#seedLabel');
  const lettersEl = $('#letters');
  const currentWordEl = $('#currentWord');
  const clearBtn = $('#clearBtn');
  const submitBtn = $('#submitBtn');
  const dailyBtn = $('#dailyBtn');
  const freeBtn = $('#freeBtn');
  const howToBtn = $('#howToBtn');
  const scoreEl = $('#score');
  const attemptsEl = $('#attempts');
  const badLeftEl = $('#badLeft');
  const locksOpenEl = $('#locksOpen');
  const locksTotalEl = $('#locksTotal');
  const locksEl = $('#locks');
  const foundEl = $('#found');
  const foundCountEl = $('#foundCount');
  const dailyResultsEl = $('#dailyResults');
  const toastEl = $('#toast');
  const modalEl = $('#modal');
  const modalTitleEl = $('#modalTitle');
  const modalBodyEl = $('#modalBody');
  const playDailyBtn = $('#playDailyBtn');
  const playFreeBtn = $('#playFreeBtn');
  const howToModal = $('#howToModal');
  const howToCloseBtn = $('#howToCloseBtn');

  const FRONT_PAGE_URL = 'https://eddiesgames.xyz';
  const WORD_LIST_SOURCES = {
    valid: '/wordlists/validWords.json',
    answers: '/wordlists/answerWords.json',
    blocked: '/wordlists/blockedWords.json',
    meta: '/wordlists/wordMeta.json',
  };

  const BANK_SIZE = 8;
  const MAX_BAD_GUESSES = 10;
  const LOCK_TOTAL = 6;
  const API_BASE = '/api/letterlock';

  const LETTER_BAG = [
    ...'eeeeeeeeeeee',
    ...'aaaaaaaaa',
    ...'iiiiiiiii',
    ...'oooooooo',
    ...'nnnnnn',
    ...'rrrrrr',
    ...'tttttt',
    ...'llll',
    ...'ssss',
    ...'uuuu',
    ...'dddd',
    ...'ggg',
    ...'bb',
    ...'cc',
    ...'mm',
    ...'pp',
    ...'ff',
    ...'hh',
    ...'vv',
    ...'ww',
    ...'yy',
    ...'k',
    ...'j',
    ...'x',
    ...'q',
    ...'z',
  ];

  let blockedSet = new Set();

  const state = {
    words: [],
    wordSet: new Set(),
    answerWords: [],
    wordMeta: null,
    mode: 'daily',
    seed: 0,
    rng: null,
    bank: [],
    selected: [],
    masterWord: '',
    possibleWords: [],
    locks: [],
    found: [],
    foundSet: new Set(),
    score: 0,
    attempts: 0,
    badLeft: MAX_BAD_GUESSES,
    locked: false,
    resultRecorded: false,
  };

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getEtDateKey(date = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(date);
  }

  function seedFromEtDate(date = new Date()) {
    return parseInt(getEtDateKey(date).replaceAll('-', ''), 10);
  }

  async function loadDailyResults() {
    if (state.mode !== 'daily') return [];

    try {
      const res = await fetch(
        `${API_BASE}/leaderboard?etDate=${encodeURIComponent(getEtDateKey())}`,
        { cache: 'no-store' },
      );

      if (!res.ok) return [];

      const data = await res.json();
      return Array.isArray(data.results) ? data.results : [];
    } catch (_) {
      return [];
    }
  }

  async function recordDailyResult(won) {
    if (!won || state.mode !== 'daily' || state.resultRecorded) return false;

    state.resultRecorded = true;

    try {
      const res = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempts: state.attempts,
          badGuesses: MAX_BAD_GUESSES - state.badLeft,
          score: state.score,
          puzzleSeed: String(state.seed),
        }),
      });

      return res.ok;
    } catch (_) {
      return false;
    }
  }

  function toast(msg) {
    toastEl.textContent = msg;
    if (!msg) return;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (toastEl.textContent = ''), 1600);
  }

  function shuffle(arr, rng = Math.random) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function pick(arr, rng = Math.random) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function freqMap(chars) {
    const map = Object.create(null);
    for (const ch of chars) map[ch] = (map[ch] || 0) + 1;
    return map;
  }

  function canMakeWord(word, letters) {
    const available = freqMap(letters);
    for (const ch of word) {
      if (!available[ch]) return false;
      available[ch]--;
    }
    return true;
  }

  function scoreWord(word) {
    const table = { 3: 1, 4: 3, 5: 6, 6: 10, 7: 15, 8: 21 };
    return table[word.length] || Math.max(1, word.length - 2);
  }

  function normalizeWordList(data) {
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => (Array.isArray(item) ? item[0] : item))
      .map((w) => String(w || '').toLowerCase().trim())
      .filter((w) => /^[a-z]+$/.test(w));
  }

  function isBlocked(word) {
    if (blockedSet.has(word)) return true;
    if (word.length < 3 || word.length > 8) return true;
    if (!/^[a-z]+$/.test(word)) return true;
    return false;
  }

  async function fetchJson(url, label) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load ${label} (${res.status})`);
    return res.json();
  }

  async function loadWords() {
    const [validData, answerData, blockedData, metaData] = await Promise.all([
      fetchJson(WORD_LIST_SOURCES.valid, 'validWords.json'),
      fetchJson(WORD_LIST_SOURCES.answers, 'answerWords.json'),
      fetchJson(WORD_LIST_SOURCES.blocked, 'blockedWords.json'),
      fetchJson(WORD_LIST_SOURCES.meta, 'wordMeta.json').catch(() => null),
    ]);

    blockedSet = new Set(normalizeWordList(blockedData));

    const validWords = normalizeWordList(validData)
      .filter((w) => w.length >= 3 && w.length <= 8)
      .filter((w) => !isBlocked(w));

    const answerWords = normalizeWordList(answerData)
      .filter((w) => w.length >= 5 && w.length <= 8)
      .filter((w) => !isBlocked(w));

    state.words = Array.from(new Set(validWords));
    state.wordSet = new Set(state.words);
    state.answerWords = Array.from(new Set(answerWords));
    state.wordMeta = metaData;

    if (state.answerWords.length < 100) {
      state.answerWords = state.words.filter((w) => w.length >= 6 && w.length <= 8);
    }

    toast(
      `Loaded ${state.words.length.toLocaleString()} valid words / ${state.answerWords.length.toLocaleString()} answers.`,
    );
  }

  function buildBank(master, rng) {
    const letters = master.split('');
    while (letters.length < BANK_SIZE) {
      letters.push(pick(LETTER_BAG, rng));
    }
    return shuffle(letters, rng);
  }

  function getPossibleWords(bank) {
    return state.words
      .filter((w) => canMakeWord(w, bank))
      .sort((a, b) => b.length - a.length || a.localeCompare(b));
  }

  function buildLocks(possibleWords, masterWord, rng) {
    const byLen = (n) => possibleWords.filter((w) => w.length === n);
    const scorey = possibleWords.filter((w) => scoreWord(w) >= 10 && w !== masterWord);

    const startCounts = new Map();
    possibleWords.forEach((w) => {
      if (w === masterWord) return;
      startCounts.set(w[0], (startCounts.get(w[0]) || 0) + 1);
    });

    const goodStarts = Array.from(startCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([letter]) => letter);

    const startLetter = goodStarts.length ? pick(goodStarts, rng) : masterWord[0];

    return [
      {
        id: 'three',
        label: 'Find any 3-letter word',
        test: (word) => word.length === 3,
        open: false,
      },
      {
        id: 'four',
        label: 'Find any 4-letter word',
        test: (word) => word.length === 4,
        open: false,
      },
      {
        id: 'five',
        label: 'Find any 5-letter word',
        test: (word) => word.length === 5,
        open: false,
      },
      {
        id: 'starter',
        label: `Find a word starting with ${startLetter.toUpperCase()}`,
        test: (word) => word[0] === startLetter,
        open: false,
      },
      {
        id: 'score',
        label: 'Find a word worth 10+ points',
        test: (word) => scoreWord(word) >= 10,
        open: false,
      },
      {
        id: 'master',
        label: `Crack the Master Word (${masterWord.length} letters)`,
        test: (word) => word === masterWord,
        open: false,
        secret: true,
      },
    ].slice(0, LOCK_TOTAL);
  }

  function puzzleWorks(possibleWords, masterWord) {
    const lengths = new Set(possibleWords.map((w) => w.length));
    const hasScoreWord = possibleWords.some((w) => scoreWord(w) >= 10);
    return (
      possibleWords.length >= 18 &&
      lengths.has(3) &&
      lengths.has(4) &&
      lengths.has(5) &&
      hasScoreWord &&
      possibleWords.includes(masterWord)
    );
  }

  function makePuzzle(seed, mode) {
    const rng = mulberry32(seed);
    const candidates = shuffle(state.answerWords, rng);

    for (const master of candidates.slice(0, 450)) {
      const bank = buildBank(master, rng);
      const possible = getPossibleWords(bank);
      if (!puzzleWorks(possible, master)) continue;

      return {
        seed,
        mode,
        bank,
        masterWord: master,
        possibleWords: possible,
        locks: buildLocks(possible, master, rng),
      };
    }

    throw new Error('Could not generate a playable LETTERLOCK puzzle.');
  }

  function startGame(mode = 'daily') {
    const seed = mode === 'daily' ? seedFromEtDate() : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    let puzzle;

    try {
      puzzle = makePuzzle(seed, mode);
    } catch (err) {
      toast(err.message);
      console.error(err);
      return;
    }

    state.mode = mode;
    state.seed = puzzle.seed;
    state.rng = mulberry32(puzzle.seed);
    state.bank = puzzle.bank;
    state.masterWord = puzzle.masterWord;
    state.possibleWords = puzzle.possibleWords;
    state.locks = puzzle.locks;
    state.selected = [];
    state.found = [];
    state.foundSet = new Set();
    state.score = 0;
    state.attempts = 0;
    state.badLeft = MAX_BAD_GUESSES;
    state.locked = false;
    state.resultRecorded = false;

    closeModal();
    renderAll();
    toast(mode === 'daily' ? 'Daily Lock loaded.' : 'Free Play lock loaded.');
  }

  function selectedWord() {
    return state.selected.map((item) => item.letter).join('');
  }

  function renderAll() {
    modeLabelEl.textContent = state.mode === 'daily' ? 'Daily Lock' : 'Free Play';
    seedLabelEl.textContent = state.mode === 'daily' ? `Seed: ${state.seed} (Daily)` : `Seed: ${state.seed} (Free Play)`;

    scoreEl.textContent = String(state.score);
    attemptsEl.textContent = String(state.attempts);
    badLeftEl.textContent = String(state.badLeft);
    locksTotalEl.textContent = String(state.locks.length);
    locksOpenEl.textContent = String(state.locks.filter((lock) => lock.open).length);
    foundCountEl.textContent = String(state.found.length);

    renderLetters();
    renderCurrentWord();
    renderLocks();
    renderFound();
    void renderDailyResults();
  }

  function renderLetters() {
    const selectedIndexes = new Set(state.selected.map((item) => item.index));
    lettersEl.innerHTML = '';

    state.bank.forEach((letter, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'letterTile';
      btn.textContent = letter.toUpperCase();
      btn.dataset.index = String(index);
      btn.disabled = selectedIndexes.has(index) || state.locked;
      btn.addEventListener('click', () => {
        if (state.locked || selectedIndexes.has(index)) return;
        state.selected.push({ letter, index });
        renderLetters();
        renderCurrentWord();
      });
      lettersEl.appendChild(btn);
    });
  }

  function renderCurrentWord() {
    const word = selectedWord();
    currentWordEl.textContent = word ? word.toUpperCase() : '—';
  }

  function renderLocks() {
    locksEl.innerHTML = '';
    state.locks.forEach((lock) => {
      const row = document.createElement('div');
      row.className = `lockRow ${lock.open ? 'open' : ''}`;
      row.innerHTML = `
        <div class="lockIcon">${lock.open ? '✓' : '🔒'}</div>
        <div class="lockText">${lock.label}</div>
      `;
      locksEl.appendChild(row);
    });
  }

  function renderFound() {
    foundEl.innerHTML = '';

    if (!state.found.length) {
      const empty = document.createElement('div');
      empty.className = 'emptyFound muted';
      empty.textContent = 'No words found yet.';
      foundEl.appendChild(empty);
      return;
    }

    state.found
      .slice()
      .reverse()
      .forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'foundRow';
        row.innerHTML = `
          <span class="foundWord">${entry.word.toUpperCase()}</span>
          <span class="foundScore">+${entry.points}</span>
        `;
        foundEl.appendChild(row);
      });
  }

  function pluralize(count, singular, plural = `${singular}s`) {
    return count === 1 ? singular : plural;
  }

  function renderResultEntries(targetEl, entries) {
    if (!targetEl) return;

    if (!entries.length) {
      targetEl.innerHTML = '<div class="resultRow muted">No solves recorded yet.</div>';
      return;
    }

    targetEl.innerHTML = entries
      .map((entry) => {
        const attempts = Number(entry.attempts);
        const count = Number(entry.total);
        return `
          <div class="resultRow">
            <span class="resultCount">${count} ${pluralize(count, 'player')}</span>
            <span class="resultText">solved in ${attempts} ${pluralize(attempts, 'attempt')}</span>
          </div>
        `;
      })
      .join('');
  }

  async function renderDailyResults(targetEl = dailyResultsEl) {
    if (!targetEl) return;
    targetEl.innerHTML = '';

    if (state.mode !== 'daily') {
      targetEl.innerHTML = '<div class="resultRow muted">Daily Results are shown for Daily Lock only.</div>';
      return;
    }

    targetEl.innerHTML = '<div class="resultRow muted">Loading Daily Results...</div>';
    const entries = await loadDailyResults();
    renderResultEntries(targetEl, entries);
  }

  function clearSelection() {
    state.selected = [];
    renderLetters();
    renderCurrentWord();
  }

  function submitCurrentWord() {
    if (state.locked) return;

    const word = selectedWord().toLowerCase();
    if (!word) {
      toast('Pick some letters first. Bold strategy otherwise.');
      return;
    }

    state.attempts++;
    renderAll();

    if (word.length < 3) {
      burnBadGuess('Words need 3+ letters.');
      return;
    }

    if (state.foundSet.has(word)) {
      toast('Already found that one.');
      clearSelection();
      return;
    }

    if (!state.wordSet.has(word) || isBlocked(word)) {
      burnBadGuess('Not in the lock dictionary.');
      return;
    }

    if (!canMakeWord(word, state.bank)) {
      burnBadGuess('That uses letters you do not have.');
      return;
    }

    acceptWord(word);
  }

  function burnBadGuess(message) {
    state.badLeft = Math.max(0, state.badLeft - 1);
    clearSelection();
    renderAll();
    toast(`${message} Bad guesses left: ${state.badLeft}`);

    if (state.badLeft <= 0) {
      void finishGame(false);
    }
  }

  function acceptWord(word) {
    const points = scoreWord(word);
    state.foundSet.add(word);
    state.found.push({ word, points });
    state.score += points;

    let openedAny = false;
    state.locks.forEach((lock) => {
      if (!lock.open && lock.test(word)) {
        lock.open = true;
        openedAny = true;
      }
    });

    clearSelection();
    renderAll();
    toast(openedAny ? 'Lock opened.' : `Word accepted. +${points}`);

    if (state.locks.every((lock) => lock.open)) {
      void finishGame(true);
    }
  }

  async function finishGame(won) {
    state.locked = true;
    renderAll();

    await recordDailyResult(won);
    await renderDailyResults();

    const opened = state.locks.filter((lock) => lock.open).length;
    const title = won ? 'Vault Opened' : 'Lock Failed';
    const body = won
      ? `Nice. You solved it in ${state.attempts} attempts with ${state.badLeft}/${MAX_BAD_GUESSES} bad guesses left.`
      : `The vault held. Master Word was ${state.masterWord.toUpperCase()}. You opened ${opened}/${state.locks.length} locks in ${state.attempts} attempts.`;

    openModal(title, body, buildShareText(won));
  }

  function buildShareText(won) {
    const datePart = state.mode === 'daily' ? `#${state.seed}` : 'Free Play';
    const opened = state.locks.filter((lock) => lock.open).length;
    const marker = won ? '🔐' : '🔒';

    return `${marker} LETTERLOCK ${datePart}
🧩 Locks: ${opened}/${state.locks.length}
🎯 Attempts: ${state.attempts}
💀 Bad guesses left: ${state.badLeft}/${MAX_BAD_GUESSES}
⭐ Score: ${state.score}

${FRONT_PAGE_URL}`;
  }

  async function copyTextToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}

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

  function openModal(title, body, shareText) {
    modalTitleEl.textContent = title;
    modalBodyEl.innerHTML = `
      <p>${body}</p>
      <p class="small muted">Master Word: <b>${state.masterWord.toUpperCase()}</b></p>
      ${state.mode === 'daily' ? `<div class="modalResults"><b>Daily Results</b><div id="modalDailyResults" class="dailyResults mini"></div></div>` : ''}
      <div class="shareRow">
        <button type="button" class="btn ghost" id="copyShareBtn">Share Result</button>
        <span class="shareHint" id="copyShareHint" aria-live="polite"></span>
      </div>
    `;

    const modalResultsEl = $('#modalDailyResults');
    if (modalResultsEl) {
      void renderDailyResults(modalResultsEl);
    }

    const copyBtn = $('#copyShareBtn');
    const hintEl = $('#copyShareHint');
    copyBtn?.addEventListener('click', async () => {
      const ok = await copyTextToClipboard(shareText);
      hintEl.textContent = ok ? 'Copied!' : 'Copy failed';
      toast(ok ? 'Copied share text.' : 'Copy failed. Browser blocked it.');
    });

    modalEl.hidden = false;
  }

  function closeModal() {
    modalEl.hidden = true;
  }

  function openHowTo() {
    howToModal.hidden = false;
  }

  function closeHowTo() {
    howToModal.hidden = true;
  }

  clearBtn.addEventListener('click', clearSelection);
  submitBtn.addEventListener('click', submitCurrentWord);
  dailyBtn.addEventListener('click', () => startGame('daily'));
  freeBtn.addEventListener('click', () => startGame('free'));
  playDailyBtn.addEventListener('click', () => startGame('daily'));
  playFreeBtn.addEventListener('click', () => startGame('free'));
  howToBtn.addEventListener('click', openHowTo);
  howToCloseBtn.addEventListener('click', closeHowTo);

  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal();
  });

  howToModal.addEventListener('click', (e) => {
    if (e.target === howToModal) closeHowTo();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeHowTo();
      return;
    }

    if (state.locked) return;

    if (e.key === 'Backspace') {
      state.selected.pop();
      renderLetters();
      renderCurrentWord();
      return;
    }

    if (e.key === 'Enter') {
      submitCurrentWord();
      return;
    }

    if (/^[a-z]$/i.test(e.key)) {
      const letter = e.key.toLowerCase();
      const used = new Set(state.selected.map((item) => item.index));
      const idx = state.bank.findIndex((ch, i) => ch === letter && !used.has(i));
      if (idx >= 0) {
        state.selected.push({ letter, index: idx });
        renderLetters();
        renderCurrentWord();
      }
    }
  });

  loadWords()
    .then(() => startGame('daily'))
    .catch((err) => {
      console.error(err);
      toast('Could not load LETTERLOCK wordlists. Word goblin escaped.');
    });
})();
