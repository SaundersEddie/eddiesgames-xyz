import { attachTimingBarGame } from "./game.js";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas #game not found or not a canvas element");
}

attachTimingBarGame({
  canvas,
  scoreEl: document.getElementById("score") || undefined,
  comboEl: document.getElementById("combo") || undefined,
  livesEl: document.getElementById("lives") || undefined,
  hintEl: document.getElementById("hint") || undefined,
  restartBtn: document.getElementById("restart") || undefined,
});
