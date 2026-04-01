// import {
  // getEtDateKey,
  // loadTop5,
  // submitScore,
  // formatTimeMs,
// } from './reacLeaderboard.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---------- SFX ----------
const SFX = {
  click: new Audio('/games/react/sounds/click.mp3'),
  win: new Audio('/games/react/sounds/win.mp3'),
};

SFX.click.volume = 0.18;
SFX.win.volume = 0.35;

function playSfx(aud) {
  aud.currentTime = 0;
  aud.play().catch(() => {});
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function makeZone(state) {
  const w = state.zoneWidth;
  const start = rand(0.05, 0.95 - w);
  state.zoneStart = start;
  state.zoneEnd = start + w;
}

function resetGame() {
  const s = {
    phase: 'ready',
    marker: 0.5,
    dir: 1,
    speed: 0.9,

    zoneStart: 0.4,
    zoneEnd: 0.6,

    score: 0,
    combo: 0,
    // bestCombo: 0,
    lives: 3,

    lastOutcome: null,
    outcomeTimer: 0,

    zoneWidth: 0.22,
    round: 1,
  };
  makeZone(s);
  return s;
}

function isInsideZone(state) {
  return state.marker >= state.zoneStart && state.marker <= state.zoneEnd;
}

function zoneCenter(state) {
  return (state.zoneStart + state.zoneEnd) / 2;
}

function handleAttempt(state) {
  // First input just starts the round — no scoring.
  if (state.phase === 'ready') {
    state.phase = 'running';
    state.lastOutcome = null;
    state.outcomeTimer = 0;
    return;
  }

  if (state.phase !== 'running') return;

  const hit = isInsideZone(state);
  if (!hit) {
    state.lives -= 1;
    state.combo = 0;
    state.lastOutcome = 'miss';
    state.outcomeTimer = 0.6;

    if (state.lives <= 0) {
      state.phase = 'gameover';
      return;
    }

    state.zoneWidth = Math.min(0.26, state.zoneWidth * 1.06);
    makeZone(state);
    return;
  }

  const center = zoneCenter(state);
  const dist = Math.abs(state.marker - center);
  const half = (state.zoneEnd - state.zoneStart) / 2;
  const accuracy = 1 - dist / Math.max(half, 1e-6);

  const perfect = accuracy >= 0.82;

  state.combo += 1;
  // state.bestCombo = Math.max(state.bestCombo, state.combo);

  const base = perfect ? 25 : 10;
  // const comboBonus = Math.min(50, state.combo * 2);
  const accuracyBonus = Math.floor(accuracy * 10);

  // state.score += base + comboBonus + accuracyBonus;
  state.score += base + accuracyBonus;

  state.lastOutcome = perfect ? 'perfect' : 'hit';
  state.outcomeTimer = 0.6;

  state.round += 1;
  state.speed = Math.min(3.2, state.speed + 0.08 + state.combo * 0.006);
  state.zoneWidth = Math.max(0.08, state.zoneWidth - 0.006);

  makeZone(state);
}

function roundRect(cts, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  cts.beginPath();
  cts.moveTo(x + rr, y);
  cts.arcTo(x + w, y, x + w, y + h, rr);
  cts.arcTo(x + w, y + h, x, y + h, rr);
  cts.arcTo(x, y + h, x, y, rr);
  cts.arcTo(x, y, x + w, y, rr);
  cts.closePath();
}

/**
 * Timing bar game (Reaction)
 */
function attachTimingBarGame(options) {
  const { canvas, scoreEl, livesEl, hintEl, restartBtn } = options;
  const ctx = canvas.getContext('2d');

  // How-to modal (existing)
  const howtoBtn = document.getElementById('howto');
  const howtoModal = document.getElementById('howtoModal');
  const howtoClose = document.getElementById('howtoClose');

  // Game Over modal (NEW / consistent with other games)
  const gameOverModal = document.getElementById('gameOverModal');
  const gameOverScoreText = document.getElementById('gameOverScoreText');
  const shareResultBtn = document.getElementById('shareResultBtn');
  const shareHint = document.getElementById('shareHint');
  const gameOverRestartBtn = document.getElementById('gameOverRestartBtn');
  const gameOverCloseBtn = document.getElementById('gameOverCloseBtn');

  canvas.tabIndex = 0;
  canvas.focus();
  if (!ctx) throw new Error('2D canvas not supported');
  const cts = ctx;

  let state = resetGame();
  let lastT = performance.now();

  // ----- Top 5 scores (local) -----
  const topScoresEl = document.getElementById('topScores');
  const SCORE_KEY = 'react_top5_points'; // later: daily ET key + DB

  function loadScores() {
    try {
      const arr = JSON.parse(localStorage.getItem(SCORE_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveScores(arr) {
    localStorage.setItem(SCORE_KEY, JSON.stringify(arr));
  }

  function renderScores() {
    if (!topScoresEl) return;
    const arr = loadScores();
    topScoresEl.innerHTML = arr.length
      ? arr.map((s) => `<li>${s} pts</li>`).join('')
      : `<li class="muted">No scores yet</li>`;
  }

  function recordScore(finalScore) {
    const arr = loadScores();
    arr.push(finalScore);
    arr.sort((a, b) => b - a);
    saveScores(arr.slice(0, 5));
    renderScores();
  }

  renderScores();

  // ----- Share (clipboard) -----
  const FRONT_PAGE_URL = 'https://eddiesgames.xyz';

  function buildShareText(finalScore) {
    return `🏆 REACTION
⏱ Score: ${finalScore} pts

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

  // ----- Game Over modal helpers -----
  function openGameOverModal() {
    if (!gameOverModal) return;
    if (gameOverScoreText)
      gameOverScoreText.textContent = `Final Score: ${state.score} pts`;
    if (shareHint) shareHint.textContent = '';
    gameOverModal.classList.remove('hidden');
  }

  function closeGameOverModal() {
    if (!gameOverModal) return;
    gameOverModal.classList.add('hidden');
    if (shareHint) shareHint.textContent = '';
  }

  // Wire modal controls once
  if (shareResultBtn) {
    shareResultBtn.addEventListener('click', async () => {
      const ok = await copyTextToClipboard(buildShareText(state.score));
      if (shareHint) shareHint.textContent = ok ? 'Copied!' : 'Copy failed';
      window.setTimeout(() => {
        if (shareHint) shareHint.textContent = '';
      }, 1200);
    });
  }

  gameOverRestartBtn?.addEventListener('click', () => {
    closeGameOverModal();
    restart();
  });

  gameOverCloseBtn?.addEventListener('click', closeGameOverModal);

  gameOverModal?.addEventListener('click', (e) => {
    if (e.target === gameOverModal) closeGameOverModal();
  });

  window.addEventListener('keydown', (e) => {
    if (
      e.key === 'Escape' &&
      gameOverModal &&
      !gameOverModal.classList.contains('hidden')
    ) {
      closeGameOverModal();
    }
  });

  // ----- How To modal (existing) -----
  function openHowto() {
    howtoModal?.classList.remove('hidden');
  }

  function closeHowto() {
    howtoModal?.classList.add('hidden');
  }

  howtoBtn?.addEventListener('click', openHowto);
  howtoClose?.addEventListener('click', closeHowto);
  howtoModal?.addEventListener('click', (e) => {
    if (e.target === howtoModal) closeHowto();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHowto();
  });

  // Track score recording so gameover doesn't spam
  let recorded = false;

  // ----- Resize: size to container panel -----
  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    cts.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updateHUD() {
    if (scoreEl) scoreEl.textContent = `Score ${state.score}`;
    // if (comboEl) comboEl.textContent = `Combo ${state.combo} (Best ${state.bestCombo})`;
    if (livesEl) {
      livesEl.textContent = `Lives ${'♥'.repeat(state.lives)}${'·'.repeat(
        Math.max(0, 3 - state.lives),
      )}`;
    }

    if (hintEl) {
      const hints = {
        ready: 'Tap / Click / Space to start',
        running: 'Stop in the zone',
        gameover: '',
      };

      hintEl.textContent = hints[state.phase] ?? '';
    }

    // Keep existing restart button behavior if it exists in your HUD
    if (restartBtn) {
      restartBtn.style.display =
        state.phase === 'gameover' ? 'inline-block' : 'none';
    }

    // Record once on gameover
    if (state.phase === 'gameover' && !recorded) {
      recorded = true;
      recordScore(state.score);
    }
  }

  function restart() {
    state = resetGame();
    lastT = performance.now();
    recorded = false;
    closeGameOverModal();
    updateHUD();
    canvas.focus();
  }

  function drawWrappedText(ctx, text, centerX, startY, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    lines.forEach((line, index) => {
      ctx.fillText(line, centerX, startY + index * lineHeight);
    });
  }

  function onInput() {
    if (state.phase === 'gameover') return;

    const wasRunning = state.phase === 'running';
    const wasGameOver = state.phase === 'gameover';

    handleAttempt(state);

    if (wasRunning) playSfx(SFX.click);

    // Transition into gameover => win sfx + open modal
    if (!wasGameOver && state.phase === 'gameover') {
      playSfx(SFX.win);
      openGameOverModal();
    }

    updateHUD();
  }

  canvas.style.touchAction = 'none';

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.focus();
    onInput();
  });

  canvas.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    onInput();
  });

  // Keep your existing restart button if it exists (optional)
  if (restartBtn) restartBtn.addEventListener('click', restart);

  window.addEventListener('resize', resize);

  function update(dt) {
    if (state.phase === 'running') {
      state.marker += state.dir * state.speed * dt;

      if (state.marker >= 1) {
        state.marker = 1;
        state.dir = -1;
      } else if (state.marker <= 0) {
        state.marker = 0;
        state.dir = 1;
      }
    }

    if (state.outcomeTimer > 0) {
      state.outcomeTimer = Math.max(0, state.outcomeTimer - dt);
      if (state.outcomeTimer === 0) state.lastOutcome = null;
    }
  }

  function render() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const barW = Math.min(760, w * 0.9);
    const barH = 28;
    const barX = (w - barW) / 2;
    const barY = h * 0.55;

    const markerX = barX + state.marker * barW;

    const zx = barX + state.zoneStart * barW;
    const zw = (state.zoneEnd - state.zoneStart) * barW;

    cts.clearRect(0, 0, w, h);

    // Background stays dark; final skin can harmonize with your site tokens later
    cts.fillStyle = '#0b0d12';
    cts.fillRect(0, 0, w, h);

    cts.fillStyle = '#e8eaee';
    cts.font = '700 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    cts.textAlign = 'center';
    cts.fillText('Timing Bar', w / 2, h * 0.22);

    cts.fillStyle = '#b6bcc8';
    cts.font = '400 16px system-ui, -apple-system, Segoe UI, Roboto, Arial';

    drawWrappedText(
      cts,
      'Stop the marker inside the zone. Perfect hits score more.',
      w / 2,
      h * 0.22 + 28,
      Math.min(w * 0.78, 320),
      22,
    );

    cts.fillStyle = '#1a2130';
    roundRect(cts, barX, barY, barW, barH, 12);
    cts.fill();

    cts.fillStyle = '#2d8cff';
    roundRect(cts, zx, barY, zw, barH, 10);
    cts.fill();

    const c = (state.zoneStart + state.zoneEnd) / 2;
    const cx = barX + c * barW;
    cts.strokeStyle = 'rgba(255,255,255,0.15)';
    cts.lineWidth = 2;
    cts.beginPath();
    cts.moveTo(cx, barY - 10);
    cts.lineTo(cx, barY + barH + 10);
    cts.stroke();

    cts.fillStyle = '#ffda6a';
    roundRect(cts, markerX - 6, barY - 10, 12, barH + 20, 6);
    cts.fill();

    if (state.lastOutcome && state.outcomeTimer > 0) {
      cts.globalAlpha = Math.min(1, state.outcomeTimer / 0.15);
      cts.font = '800 24px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      cts.fillStyle =
        state.lastOutcome === 'miss'
          ? '#ff5a6a'
          : state.lastOutcome === 'perfect'
            ? '#7dff9a'
            : '#e8eaee';
      const msg =
        state.lastOutcome === 'miss'
          ? 'MISS'
          : state.lastOutcome === 'perfect'
            ? 'PERFECT!'
            : 'HIT';
      cts.fillText(msg, w / 2, barY + 80);
      cts.globalAlpha = 1;
    }

    // NOTE: canvas still draws "game over" overlay — not harmful,
    // but your real modal will be on top. We can remove later if you want.
    if (state.phase === 'gameover') {
      cts.fillStyle = 'rgba(0,0,0,0.55)';
      cts.fillRect(0, 0, w, h);

      cts.fillStyle = '#e8eaee';
      cts.font = '900 34px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      cts.fillText('Game Over', w / 2, h * 0.45);

      cts.font = '600 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      cts.fillText(`Final Score: ${state.score}`, w / 2, h * 0.45 + 34);
      cts.fillText('Hit Restart to play again', w / 2, h * 0.45 + 62);
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // First layout pass
  requestAnimationFrame(() => {
    resize();
    updateHUD();
    requestAnimationFrame(loop);
  });

  return { restart, getState: () => state };
}

export { attachTimingBarGame };

// ---------- AUTO INIT ----------
function init() {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Canvas #game not found or not a canvas element');
  }

  attachTimingBarGame({
    canvas,
    scoreEl: document.getElementById('score') || undefined,
    // comboEl: document.getElementById("combo") || undefined,
    livesEl: document.getElementById('lives') || undefined,
    hintEl: document.getElementById('hint') || undefined,
    restartBtn: document.getElementById('restart') || undefined,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
