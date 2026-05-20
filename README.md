# eddiesgames.xyz

A small, fast, browser-based game site built with Astro, Cloudflare Pages/Workers, and Cloudflare D1.

The goal of this project is simple: build a growing collection of clean, lightweight games that work well on desktop and mobile, with daily challenges, local/free-play modes, and simple leaderboard support where it makes sense.

No accounts.  
No player names.  
No nonsense.  
Just games.

---

## Live Site

https://eddiesgames.xyz

---

## Current Games

### REDACTED

A logic-driven word hunt on a 5×5 grid.

Players trace real words, gather clues, and try to uncover the hidden case in as few guesses as possible.

**Features:**

- Daily puzzle
- Daily leaderboard
- Guess-based scoring
- Share/result support

---

### MATCH

A classic pair-matching memory game.

Players flip cards, match pairs, and try to finish with the fastest time and fewest moves.

**Features:**

- Multiple difficulty modes
- Daily scoring by mode
- Daily Top 3 leaderboard
- Time and move tracking

---

### REACTION

A timing/reflex challenge.

Players stop a moving marker inside the target zone. The game gets harder as the run continues.

**Features:**

- Reflex-based scoring
- Lives system
- Daily Top 5 leaderboard
- Result/share modal

---

### SEQUENCE

A pattern memory game.

Players watch a sequence, then repeat it correctly. Each round grows longer.

**Features:**

- Pattern repetition gameplay
- Score tracking
- Daily leaderboard
- Mobile-friendly controls

---

### SHIFT

A slide, merge, and survive game inspired by number-merging puzzle mechanics.

Players slide tiles, merge matching values, and push for the highest score before the board locks up.

**Features:**

- Daily mode
- Random/free-play mode
- Score, best tile, and move tracking
- Daily leaderboard
- Share/result modal

---

### SUDOKU

A Sudoku game with generated boards, notes, highlighting, lives, and daily scoring.

The board is generated from a valid completed solution. Numbers are removed based on the selected mode, and entries are checked against the known solution.

**Features:**

- Daily puzzle
- Easy / Medium / Hard free-play modes
- Notes mode
- Row, column, box, and matching-number highlighting
- Correct/wrong entry feedback
- 3-life system to prevent brute-force guessing
- Game Over modal
- Daily Top 3 leaderboard
- Share Result modal
- Mobile layout support

---

## Tech Stack

- **Astro**
- **TypeScript**
- **Vanilla HTML/CSS/JavaScript games**
- **Cloudflare Pages / Workers**
- **Cloudflare D1**
- **Wrangler**
- **npm**

---

## Project Structure

The project is organized so each game keeps its own static game files and API routes.

Typical layout:

```text
src/
  pages/
    api/
      match/
        leaderboard.ts
        submit.ts
      react/
        leaderboard.ts
        submit.ts
      redacted/
        leaderboard.ts
        submit.ts
      sequence/
        leaderboard.ts
        submit.ts
      shift/
        leaderboard.ts
        submit.ts
      sudoku/
        leaderboard.js
        submit.js

public/
  games/
    match/
      matchIndex.html
      matchGame.css
      matchGame.js
    react/
      reactIndex.html
      reactGame.css
      reactGame.js
    redacted/
      redactedIndex.html
      redactedGame.css
      redactedGame.js
    sequence/
      sequenceIndex.html
      sequenceGame.css
      sequenceGame.js
    shift/
      shiftIndex.html
      shiftGame.css
      shiftGame.js
    sudoku/
      sudokuIndex.html
      sudokuGame.css
      sudokuGame.js

```
