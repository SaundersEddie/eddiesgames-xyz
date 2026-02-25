const clamp01 = (x) => Math.max(0, Math.min(1, x));

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
    phase: "ready",
    marker: 0.5,
    dir: 1,
    speed: 0.9,

    zoneStart: 0.4,
    zoneEnd: 0.6,

    score: 0,
    combo: 0,
    bestCombo: 0,
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
  if (state.phase === "ready") state.phase = "running";
  if (state.phase !== "running") return;

  const hit = isInsideZone(state);
  if (!hit) {
    state.lives -= 1;
    state.combo = 0;
    state.lastOutcome = "miss";
    state.outcomeTimer = 0.6;

    if (state.lives <= 0) {
      state.phase = "gameover";
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
  state.bestCombo = Math.max(state.bestCombo, state.combo);

  const base = perfect ? 25 : 10;
  const comboBonus = Math.min(50, state.combo * 2);
  const accuracyBonus = Math.floor(accuracy * 10);

  state.score += base + comboBonus + accuracyBonus;

  state.lastOutcome = perfect ? "perfect" : "hit";
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

function attachTimingBarGame(options) {
  const { canvas, scoreEl, comboEl, livesEl, hintEl, restartBtn } = options;

  const ctx = canvas.getContext("2d");
  canvas.tabIndex = 0;
  canvas.focus();
  if (!ctx) throw new Error("2D canvas not supported");
  const cts = ctx;

  let state = resetGame();
  let lastT = performance.now();

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    cts.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updateHUD() {
    if (scoreEl) scoreEl.textContent = `Score: ${state.score}`;
    if (comboEl) comboEl.textContent = `Combo: ${state.combo} (Best: ${state.bestCombo})`;
    if (livesEl) livesEl.textContent = `Lives: ${"♥".repeat(state.lives)}${"·".repeat(Math.max(0, 3 - state.lives))}`;

    if (hintEl) {
      if (state.phase === "ready") hintEl.textContent = "Tap / Click / Space to start";
      else if (state.phase === "running") hintEl.textContent = "Stop in the zone";
      else if (state.phase === "gameover") hintEl.textContent = "Game over";
    }

    if (restartBtn) restartBtn.style.display = state.phase === "gameover" ? "inline-block" : "none";
  }

  function restart() {
    state = resetGame();
    lastT = performance.now();
    updateHUD();
  }

  function onInput() {
    if (state.phase === "gameover") return;
    handleAttempt(state);
    updateHUD();
  }

  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.focus();
    onInput();
  });

  function isActionKey(e) {
    return e.code === "Space" || e.code === "Enter" || e.key === " ";
  }

  canvas.addEventListener("keydown", (e) => {
    if (e.code !== "Space" && e.code !== "Enter") return;

    e.preventDefault();
    if (e.repeat) return;

    onInput();
  });

  if (restartBtn) restartBtn.addEventListener("click", restart);
  window.addEventListener("resize", resize);

  function update(dt) {
    if (state.phase === "running") {
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
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const barW = Math.min(760, w * 0.9);
    const barH = 28;
    const barX = (w - barW) / 2;
    const barY = h * 0.55;

    const markerX = barX + state.marker * barW;

    const zx = barX + state.zoneStart * barW;
    const zw = (state.zoneEnd - state.zoneStart) * barW;

    cts.clearRect(0, 0, w, h);

    cts.fillStyle = "#0b0d12";
    cts.fillRect(0, 0, w, h);

    cts.fillStyle = "#e8eaee";
    cts.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    cts.textAlign = "center";
    cts.fillText("Timing Bar", w / 2, h * 0.22);

    cts.fillStyle = "#b6bcc8";
    cts.font = "400 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    cts.fillText("Stop the marker inside the zone. Perfect hits score more.", w / 2, h * 0.22 + 28);

    cts.fillStyle = "#1a2130";
    roundRect(cts, barX, barY, barW, barH, 12);
    cts.fill();

    cts.fillStyle = "#2d8cff";
    roundRect(cts, zx, barY, zw, barH, 10);
    cts.fill();

    const c = (state.zoneStart + state.zoneEnd) / 2;
    const cx = barX + c * barW;
    cts.strokeStyle = "rgba(255,255,255,0.15)";
    cts.lineWidth = 2;
    cts.beginPath();
    cts.moveTo(cx, barY - 10);
    cts.lineTo(cx, barY + barH + 10);
    cts.stroke();

    cts.fillStyle = "#ffda6a";
    roundRect(cts, markerX - 6, barY - 10, 12, barH + 20, 6);
    cts.fill();

    if (state.lastOutcome && state.outcomeTimer > 0) {
      cts.globalAlpha = Math.min(1, state.outcomeTimer / 0.15);
      cts.font = "800 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      cts.fillStyle =
        state.lastOutcome === "miss" ? "#ff5a6a" : state.lastOutcome === "perfect" ? "#7dff9a" : "#e8eaee";
      const msg = state.lastOutcome === "miss" ? "MISS" : state.lastOutcome === "perfect" ? "PERFECT!" : "HIT";
      cts.fillText(msg, w / 2, barY + 80);
      cts.globalAlpha = 1;
    }

    if (state.phase === "gameover") {
      cts.fillStyle = "rgba(0,0,0,0.55)";
      cts.fillRect(0, 0, w, h);

      cts.fillStyle = "#e8eaee";
      cts.font = "900 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      cts.fillText("Game Over", w / 2, h * 0.45);

      cts.font = "600 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      cts.fillText(`Final Score: ${state.score}`, w / 2, h * 0.45 + 34);
      cts.fillText("Hit Restart to play again", w / 2, h * 0.45 + 62);
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  resize();
  updateHUD();
  requestAnimationFrame(loop);

  return { restart, getState: () => state };
}

export { attachTimingBarGame };