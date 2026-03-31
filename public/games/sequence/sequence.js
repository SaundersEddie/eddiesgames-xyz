(() => {
  // ---------- DOM ----------
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const statusTextEl = document.getElementById('statusText');
  const startBtn = document.getElementById('startBtn');
  const pads = Array.from(document.querySelectorAll('.pad'));

  const howToBtn = document.getElementById('howToBtn');
  const howToModal = document.getElementById('howToModal');
  const closeHowToBtn = document.getElementById('closeHowToBtn');

  const gameOverModal = document.getElementById('gameOverModal');
  const finalScoreEl = document.getElementById('finalScore');
  const finalBestEl = document.getElementById('finalBest');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const closeGameOverBtn = document.getElementById('closeGameOverBtn');

  // ---------- SFX ----------
  const SFX = {
    click: new Audio('/games/sequence/sounds/click.ogg'),
    tone: new Audio('/games/sequence/sounds/tone.ogg'),
    fail: new Audio('/games/sequence/sounds/fail.ogg'),
  };

  SFX.click.volume = 0.25;
  SFX.tone.volume = 0.35;
  SFX.fail.volume = 0.45;

  function playSfx(aud) {
    try {
      aud.currentTime = 0;
      aud.play().catch(() => {});
    } catch (_) {}
  }

  // ---------- Storage ----------
  const BEST_KEY = 'sequence:best-score';
  const FRONT_PAGE_URL = 'https://eddiesgames.xyz';

  function loadBestScore() {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveBestScore(score) {
    try {
      localStorage.setItem(BEST_KEY, String(score));
    } catch (_) {}
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
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  function buildShareText(score) {
    return `🏆 SEQUENCE • ${score}
🧠 Best Chain: ${score}

${FRONT_PAGE_URL}`;
  }

  // ---------- Game State ----------
  let sequence = [];
  let playerInput = [];
  let score = 0;
  let bestScore = loadBestScore();
  let gameState = 'idle';

  // ---------- Helpers ----------
  function setScore(n) {
    score = n;
    scoreEl.textContent = String(score);
  }

  function setBest(n) {
    bestScore = n;
    bestEl.textContent = String(bestScore);
  }

  function setStatus(text) {
    statusTextEl.textContent = text;
  }

  function randomPadIndex() {
    return Math.floor(Math.random() * 4);
  }

  function addStepToSequence() {
    sequence.push(randomPadIndex());
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

    function flashPad(index, ms = 320, withSound = false) {
    const pad = pads[index];
    if (!pad) return;

    pad.classList.add('active');

    if (withSound) {
        playSfx(SFX.tone);
    }

    setTimeout(() => {
        pad.classList.remove('active');
    }, ms);
    }
  async function playSequence() {
    gameState = 'showing';
    playerInput = [];
    setStatus('Watch the pattern');

    await sleep(450);

    for (let i = 0; i < sequence.length; i++) {
      flashPad(sequence[i],320, true);
      await sleep(520);
    }

    gameState = 'input';
    setStatus('Your turn');
  }

  function updateBestIfNeeded() {
    if (score > bestScore) {
      setBest(score);
      saveBestScore(score);
    }
  }

  async function nextRound() {
    addStepToSequence();
    await playSequence();
  }

  function resetGameState() {
    sequence = [];
    playerInput = [];
    setScore(0);
    gameState = 'idle';
    setStatus('Press Start');
  }

  function startGame() {
    hideGameOverModal();
    resetGameState();
    startBtn.textContent = 'Restart';
    nextRound();
  }

  function showGameOverModal(shareText = '') {
    finalScoreEl.textContent = String(score);
    finalBestEl.textContent = String(bestScore);
    gameOverModal.classList.remove('hidden');

    let shareRow = gameOverModal.querySelector('.shareRow');
    if (!shareRow) {
      const modalBody = gameOverModal.querySelector('.modalBody');

      shareRow = document.createElement('div');
      shareRow.className = 'shareRow';
      shareRow.innerHTML = `
        <button type="button" class="btn ghost" id="shareResultBtn">Share Result</button>
        <span class="shareHint" id="shareHint"></span>
      `;

      modalBody.appendChild(shareRow);
    }

    const btn = shareRow.querySelector('#shareResultBtn');
    const hint = shareRow.querySelector('#shareHint');

    hint.textContent = '';

    btn.onclick = async () => {
      const ok = await copyTextToClipboard(shareText);
      hint.textContent = ok ? 'Copied!' : 'Copy failed';
    };
  }

  function hideGameOverModal() {
    gameOverModal.classList.add('hidden');
  }

  function endGame() {
    gameState = 'gameover';
    updateBestIfNeeded();
    setStatus(`Game Over • Score: ${score}`);

    playSfx(SFX.fail);

    const shareText = buildShareText(score);
    showGameOverModal(shareText);
  }

  async function handlePadInput(index) {
    if (gameState !== 'input') return;

    playSfx(SFX.click);
    flashPad(index, 200, false);

    playerInput.push(index);

    const currentIndex = playerInput.length - 1;

    if (playerInput[currentIndex] !== sequence[currentIndex]) {
      endGame();
      return;
    }

    if (playerInput.length < sequence.length) {
      setStatus(`Your turn • ${playerInput.length}/${sequence.length}`);
      return;
    }

    setScore(score + 1);
    updateBestIfNeeded();
    gameState = 'showing';
    setStatus('Correct');

    await sleep(650);
    await nextRound();
  }

  // ---------- Modal ----------
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

  gameOverModal?.addEventListener('click', (e) => {
    if (e.target === gameOverModal) hideGameOverModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeHowTo();
      hideGameOverModal();
    }
  });

  // ---------- Events ----------
  startBtn.addEventListener('click', startGame);

  playAgainBtn?.addEventListener('click', startGame);
  closeGameOverBtn?.addEventListener('click', hideGameOverModal);

  pads.forEach((pad, index) => {
    pad.addEventListener('click', () => handlePadInput(index));
  });

  // ---------- Init ----------
  setBest(bestScore);
  setScore(0);
  setStatus('Press Start');
})();
