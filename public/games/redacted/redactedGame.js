(() => {
  // ---------- DOM ----------
  const gridEl = document.getElementById('grid');
  const currentWordEl = document.getElementById('currentWord');
  const clearBtn = document.getElementById('clearBtn');
  const submitBtn = document.getElementById('submitBtn');
  const turnsLeftEl = document.getElementById('turnsLeft');
  const toastEl = document.getElementById('toast');
  const historyEl = document.getElementById('history');
  const guessesCountEl = document.getElementById('guessesCount');
  const lastHeatEl = document.getElementById('lastHeat');
  const lastOrderEl = document.getElementById('lastOrder');
  const seedLabelEl = document.getElementById('seedLabel');
  const newCaseBtn = document.getElementById('newCaseBtn');

  const modalEl = document.getElementById('modal');
  const modalTitleEl = document.getElementById('modalTitle');
  const modalBodyEl = document.getElementById('modalBody');
  const playDailyBtn = document.getElementById('playDailyBtn');
  const playNewBtn = document.getElementById('playNewBtn');
  const howToBtn = document.getElementById('howToBtn');
  const howToModal = document.getElementById('howToModal');
  const howToCloseBtn = document.getElementById('howToCloseBtn');
  const lettersRequiredEl = document.getElementById('lettersRequired');

  const SFX = {
    key: new Audio('/games/redacted/sounds/keypress.mp3'),
    win: new Audio('/games/redacted/sounds/win.mp3'),
  };

  SFX.key.volume = 0.18;
  SFX.win.volume = 0.35;

  function playSfx(aud) {
    try {
      aud.currentTime = 0;
      aud.play();
    } catch (_) {}
  }

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedFromDate(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return parseInt(`${y}${m}${day}`, 10);
  }

  function toast(msg) {
    toastEl.textContent = msg;
    if (!msg) return;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (toastEl.textContent = ''), 1400);
  }

  const FRONT_PAGE_URL = 'https://eddiesgames.xyz';

  function buildShareText({ won, guessesUsed, maxTurns }) {
    const scorePart = won ? `${guessesUsed}/${maxTurns}` : `X/${maxTurns}`;
    const marker = won ? '🏆' : '💀';

    const header = `${marker} REDACTED • ${scorePart}`;

    const lines = guesses.map((g) => {
      const heat = String(g.heat); // no pad
      const order = String(g.orderHit); // no pad
      return `🔥 ${heat} 🎯 ${order}`;
    });

    return `${header}

${lines.join('\n')}

https://eddiesgames.xyz`;
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

  function openModal(title, body, opts = null) {
    modalTitleEl.textContent = title;
    modalBodyEl.textContent = body;

    if (opts?.shareText) {
      let wrap = modalBodyEl.querySelector('.shareRow');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'shareRow';
        wrap.innerHTML = `
          <button type="button" class="btn ghost" id="copyShareBtn">Share Result</button>
          <span class="shareHint" id="copyShareHint" aria-live="polite"></span>
        `;
        modalBodyEl.appendChild(document.createElement('br'));
        modalBodyEl.appendChild(wrap);
      }

      const copyBtn = wrap.querySelector('#copyShareBtn');
      const hintEl = wrap.querySelector('#copyShareHint');

      hintEl.textContent = '';

      copyBtn.onclick = async () => {
        const ok = await copyTextToClipboard(opts.shareText);
        if (ok) {
          hintEl.textContent = 'Copied!';
          toast('Copied share text.');
        } else {
          hintEl.textContent = 'Copy failed';
          toast('Copy failed. (Browser blocked it.)');
        }
      };
    }

    modalEl.hidden = false;
  }

  function closeModal() {
    modalEl.hidden = true;
  }

  let WORDS = [];
  let DICT = new Set();
  let SECRET_CANDIDATES = [];

  async function loadWordList() {
    const url = new URL('words.json', window.location.href);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load words.json (${res.status})`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('words.json is empty or not an array');
    }

    let list;
    if (typeof data[0] === 'string') {
      list = data;
    } else if (Array.isArray(data[0])) {
      list = data.map((x) => x && x[0]).filter(Boolean);
    } else {
      throw new Error('words.json format not recognized');
    }

    list = list
      .map((w) => String(w).toLowerCase().trim())
      .filter((w) => /^[a-z]+$/.test(w))
      .filter((w) => w.length >= 3 && w.length <= 8);

    DICT = new Set(list);
    WORDS = Array.from(DICT);
    SECRET_CANDIDATES = WORDS.filter((w) => w.length >= 5 && w.length <= 8);

    toast(`Loaded ${WORDS.length.toLocaleString()} words.`);
  }

  // ---------- Letter bag ----------
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

  const SIZE = 5;
  const MAX_TURNS = 8;

  function setLettersRequired(n) {
    lettersRequiredEl.textContent = String(n);
  }

  function idxToRC(idx) {
    return [Math.floor(idx / SIZE), idx % SIZE];
  }
  function rcToIdx(r, c) {
    return r * SIZE + c;
  }

  function neighbors(idx) {
    const [r, c] = idxToRC(idx);
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = r + dr,
          cc = c + dc;
        if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE)
          out.push(rcToIdx(rr, cc));
      }
    }
    return out;
  }

  function canTraceWord(grid, word) {
    word = word.toLowerCase();
    if (word.length < 1) return false;

    const starts = [];
    for (let i = 0; i < grid.length; i++)
      if (grid[i] === word[0]) starts.push(i);
    if (!starts.length) return false;

    const used = new Array(grid.length).fill(false);

    function dfs(pos, k) {
      if (k === word.length) return true;
      for (const nb of neighbors(pos)) {
        if (used[nb]) continue;
        if (grid[nb] !== word[k]) continue;
        used[nb] = true;
        if (dfs(nb, k + 1)) return true;
        used[nb] = false;
      }
      return false;
    }

    for (const s of starts) {
      used[s] = true;
      if (dfs(s, 1)) return true;
      used[s] = false;
    }
    return false;
  }

  function scoreGuess(guess, secret) {
    guess = guess.toLowerCase();
    secret = secret.toLowerCase();

    let orderHit = 0;
    const minLen = Math.min(guess.length, secret.length);
    for (let i = 0; i < minLen; i++) {
      if (guess[i] === secret[i]) orderHit++;
    }

    const freq = Object.create(null);
    for (const ch of secret) freq[ch] = (freq[ch] || 0) + 1;

    let heat = 0;
    for (const ch of guess) {
      if (freq[ch] > 0) {
        freq[ch]--;
        heat++;
      }
    }
    return { heat, orderHit };
  }

  // ---------- Game state ----------
  let rng = null;
  let grid = [];
  let secret = '';
  let turnsLeft = MAX_TURNS;
  let guesses = [];
  let selected = [];
  let locked = false;

  // ---------- Grid creation + secret selection ----------
  function makeGrid(rngFn) {
    const g = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const ch = LETTER_BAG[Math.floor(rngFn() * LETTER_BAG.length)];
      g.push(ch);
    }
    return g;
  }

  function pickSecretWord(rngFn, grid) {
    if (!SECRET_CANDIDATES.length) return '';

    const candidates = SECRET_CANDIDATES.slice();

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rngFn() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const w of candidates) {
      if (canTraceWord(grid, w)) return w;
    }
    return '';
  }

  function resetSelection() {
    selected = [];
    currentWordEl.textContent = '—';
    updateTileStates();
  }

  function currentWord() {
    return selected.map((i) => grid[i]).join('');
  }

  function updateTileStates() {
    const selectedSet = new Set(selected);
    const last = selected.length ? selected[selected.length - 1] : null;
    const nextAllowed = last == null ? null : new Set(neighbors(last));

    const tiles = gridEl.querySelectorAll('.tile');
    tiles.forEach((el) => {
      const idx = parseInt(el.dataset.idx, 10);
      el.classList.toggle('selected', selectedSet.has(idx));

      let blocked = false;
      if (selected.length > 0) {
        if (selectedSet.has(idx)) blocked = true;
        else if (!nextAllowed.has(idx)) blocked = true;
      }
      el.classList.toggle('blocked', blocked);
      el.setAttribute('aria-disabled', blocked ? 'true' : 'false');
    });
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    for (let i = 0; i < grid.length; i++) {
      const btn = document.createElement('button');
      btn.className = 'tile';
      btn.type = 'button';
      btn.textContent = grid[i].toUpperCase();
      btn.dataset.idx = String(i);
      btn.addEventListener('click', () => onTileClick(i));
      gridEl.appendChild(btn);
    }
    updateTileStates();
  }

  function renderHistory() {
    historyEl.innerHTML = '';
    guessesCountEl.textContent = String(guesses.length);

    for (const g of guesses.slice().reverse()) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div class="rowWord">${g.word.toUpperCase()}</div>
        <div class="rowMeta">
          <span class="badge">🔥 ${g.heat}</span>
          <span class="badge">🎯 ${g.orderHit}</span>
        </div>
      `;
      historyEl.appendChild(row);
    }
  }

  function setTurns(n) {
    turnsLeft = n;
    turnsLeftEl.textContent = String(turnsLeft);
  }

  function setLastIntel(heat, orderHit) {
    lastHeatEl.textContent = String(heat);
    lastOrderEl.textContent = String(orderHit);
  }

  function startCase({ daily = true } = {}) {
    locked = false;
    guesses = [];
    renderHistory();
    setLastIntel('—', '—');
    setTurns(MAX_TURNS);
    resetSelection();
    closeModal();

    const seed = daily
      ? seedFromDate(new Date())
      : Math.floor(Math.random() * 1e9) >>> 0;
    rng = mulberry32(seed);
    seedLabelEl.textContent = daily
      ? `Seed: ${seed} (Daily)`
      : `Seed: ${seed} (Random)`;

    let tries = 0;
    while (tries < 250) {
      const g = makeGrid(rng);
      const s = pickSecretWord(rng, g);
      if (s) {
        grid = g;
        secret = s;
        setLettersRequired(secret.length);
        renderGrid();
        return;
      }
      tries++;
    }

    // fallback if your list is weirdly incompatible
    grid = makeGrid(() => Math.random());
    secret = 'secret';
    setLettersRequired(secret.length);
    renderGrid();
    toast('Couldn’t find a solvable case. (Word list might be too weird.)');
  }

  // ---------- Input handling ----------
  function isAdjacent(a, b) {
    return neighbors(a).includes(b);
  }

  function onTileClick(idx) {
    if (locked) return;

    if (selected.length === 0) {
      selected.push(idx);
      playSfx(SFX.key);
      currentWordEl.textContent = currentWord();
      updateTileStates();
      return;
    }

    const last = selected[selected.length - 1];
    if (selected.includes(idx)) return toast('No repeats.');
    if (!isAdjacent(last, idx)) return toast('Must be adjacent.');

    selected.push(idx);
    playSfx(SFX.key);
    currentWordEl.textContent = currentWord();
    updateTileStates();
  }

  async function loadTop5Redacted() {
    try {
      const res = await fetch('/api/redacted/leaderboard', {
        cache: 'no-store',
      });

      if (!res.ok) throw new Error(`Leaderboard failed: ${res.status}`);

      const data = await res.json();

      const list = document.getElementById('top5');
      if (!list) return;

      const dateEl = document.getElementById('top5Date');
      if (dateEl) {
        dateEl.textContent = data.etDate || new Date().toLocaleDateString('en-CA', {
          timeZone: 'America/New_York',
        });
      }

      const entries = Array.isArray(data.entries) ? data.entries : [];

     const grouped = new Map();

for (const entry of entries) {
  const guesses = Number(entry.guesses);
  if (!Number.isFinite(guesses)) continue;

  grouped.set(guesses, (grouped.get(guesses) || 0) + (Number(entry.total) || 1));
}

const groupedEntries = Array.from(grouped.entries())
  .map(([guesses, total]) => ({ guesses, total }))
  .sort((a, b) => a.guesses - b.guesses);

  list.innerHTML = groupedEntries.length
    ? groupedEntries
        .map((entry) => {
          const playerWord = entry.total === 1 ? 'player' : 'players';
          const guessWord = entry.guesses === 1 ? 'guess' : 'guesses';

          return `<li>${entry.total} ${playerWord} solved in ${entry.guesses} ${guessWord}</li>`;
        })
        .join('')
    : `<li class="muted">No solves yet</li>`;
    } catch (err) {
      console.error('Could not load Redacted leaderboard:', err);
    }
  }

  function submitCurrent() {
    if (locked) return;

    const isDaily = seedLabelEl.textContent.includes('(Daily)');

    const w = currentWord().toLowerCase();
    if (w.length < 3) return toast('3+ letters.');
    if (!DICT.has(w)) return toast('Not in dictionary.');
    if (!canTraceWord(grid, w)) return toast('Invalid trace.');
    if (guesses.some((g) => g.word === w)) return toast('Already guessed.');

    const { heat, orderHit } = scoreGuess(w, secret);
    guesses.push({ word: w, heat, orderHit });
    setLastIntel(heat, orderHit);
    renderHistory();

    if (w === secret) {
      locked = true;
      playSfx(SFX.win);

   if (isDaily) {
    fetch('/api/redacted/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guesses: guesses.length }),
      })
      .then((res) => {
        if (!res.ok) throw new Error(`Score submit failed: ${res.status}`);
          return loadTop5Redacted();
        })
      .catch((err) => {
        console.error('Could not submit Redacted score:', err);
        });
      }

      const shareText = buildShareText({
        won: true,
        guessesUsed: guesses.length,
        maxTurns: MAX_TURNS,
        isDaily,
      });

      openModal(
        'Case Closed.',
        `You nailed it: ${secret.toUpperCase()} • Win in ${guesses.length}/${MAX_TURNS}.`,
        { shareText },
      );
      return;
    }

    setTurns(turnsLeft - 1);
    resetSelection();

    if (turnsLeft <= 0) {
      locked = true;

      const shareText = buildShareText({
        won: false,
        guessesUsed: guesses.length,
        maxTurns: MAX_TURNS,
        isDaily,
      });

      openModal(
        'Case Went Cold.',
        `Out of turns. The word was ${secret.toUpperCase()}.`,
        { shareText },
      );
      return;
    }

    toast(`Intel: 🔥${heat}  🎯${orderHit}`);
    gridEl.classList.add('pulse');
    setTimeout(() => gridEl.classList.remove('pulse'), 200);
  }

  // ---------- Events ----------
  clearBtn.addEventListener('click', () => {
    if (locked) return;
    resetSelection();
    toast('');
  });

  submitBtn.addEventListener('click', submitCurrent);

  window.addEventListener('keydown', (e) => {
    if (modalEl.hidden === false) {
      if (e.key === 'Escape') closeModal();
      return;
    }
    if (howToModal.hidden === false) {
      if (e.key === 'Escape') howToModal.hidden = true;
      return;
    }
    if (e.key === 'Enter') submitCurrent();
    if (e.key === 'Escape') resetSelection();
  });

  newCaseBtn.addEventListener('click', () => startCase({ daily: false }));
  playDailyBtn.addEventListener('click', () => startCase({ daily: true }));
  playNewBtn.addEventListener('click', () => startCase({ daily: false }));
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal();
  });

  howToBtn.addEventListener('click', () => {
    howToModal.hidden = false;
  });

  howToCloseBtn.addEventListener('click', () => {
    howToModal.hidden = true;
  });

  howToModal.addEventListener('click', (e) => {
    if (e.target === howToModal) howToModal.hidden = true;
  });

  window.addEventListener('keydown', (e) => {
    if (howToModal.hidden === false && e.key === 'Escape') {
      howToModal.hidden = true;
    }
  });

  // ---------- Leaderboard ----------
  function nyDayString() {
    // matches server-side "America/New_York" day bucketing
    return new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    });
  }

  // function submitScore({ game, score, isDaily }) {
  //   // Optional: only record daily games so the board isn't polluted by random seeds
  //   if (!isDaily) return;

  //   fetch('/api/score', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ game, score }),
  //   }).catch(() => {});
  // }

  // async function loadTop5({ game }) {
  //   try {
  //     const res = await fetch(
  //       `/api/leaderboard?game=${encodeURIComponent(game)}`,
  //       {
  //         cache: 'no-store',
  //       },
  //     );
  //     const scores = await res.json(); // [1,2,3...]

  //     // Your HTML needs an element with id="top5"
  //     const el = document.getElementById('top5');
  //     if (!el) return;

  //     el.innerHTML = scores.length
  //       ? scores.map((s) => `<li>${s}</li>`).join('')
  //       : `<li>No scores yet</li>`;
  //   } catch (_) {}
  // }

  // ---------- Boot ----------
  (async () => {
    try {
      await loadWordList();
      startCase({ daily: true });
      loadTop5Redacted();
    } catch (e) {
      console.error(e);
      toast('Missing words.json — using fallback mini-list.');
      WORDS = [
        'trace',
        'cipher',
        'signal',
        'secret',
        'shadow',
        'letter',
        'market',
        'corner',
        'silent',
      ];
      DICT = new Set(WORDS);
      SECRET_CANDIDATES = WORDS.filter((w) => w.length >= 5 && w.length <= 8);
      startCase({ daily: true });
      loadTop5Redacted();
    }
  })();
})();
