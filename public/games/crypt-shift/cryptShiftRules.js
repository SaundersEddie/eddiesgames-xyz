export const FIXED_ROOM = [
  '############',
  '#P.........#',
  '#.###..##..#',
  '#...R......#',
  '#..###.....#',
  '#.....M....#',
  '#.##....##.#',
  '#R......R..#',
  '#.........X#',
  '############',
];

export function getEasternDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function generateDailyRoom(date = new Date()) {
  return generateRoomFromSeed(getEasternDateKey(date));
}

export function generateRoomFromSeed(seedText) {
  const width = 12;
  const height = 10;
  const grid = Array.from({ length: height }, () => Array(width).fill('#'));
  const random = mulberry32(hashString(String(seedText)));
  const start = { x: 1, y: 1 };
  const stack = [start];
  const visited = new Set([positionKey(start)]);
  grid[start.y][start.x] = '.';

  while (stack.length) {
    const current = stack.at(-1);
    const candidates = [
      { x: current.x, y: current.y - 2 },
      { x: current.x + 2, y: current.y },
      { x: current.x, y: current.y + 2 },
      { x: current.x - 2, y: current.y },
    ].filter((next) =>
      next.x > 0 && next.y > 0 && next.x < width - 1 && next.y < height - 1 &&
      !visited.has(positionKey(next))
    );

    if (!candidates.length) {
      stack.pop();
      continue;
    }

    const next = candidates[Math.floor(random() * candidates.length)];
    const between = {
      x: current.x + (next.x - current.x) / 2,
      y: current.y + (next.y - current.y) / 2,
    };
    grid[between.y][between.x] = '.';
    grid[next.y][next.x] = '.';
    visited.add(positionKey(next));
    stack.push(next);
  }

  // Open a few extra passages so the daily room is not always a single corridor.
  const wallCandidates = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (grid[y][x] !== '#') continue;
      const horizontal = grid[y][x - 1] === '.' && grid[y][x + 1] === '.';
      const vertical = grid[y - 1][x] === '.' && grid[y + 1][x] === '.';
      if (horizontal || vertical) wallCandidates.push({ x, y });
    }
  }
  shuffle(wallCandidates, random).slice(0, 3).forEach(({ x, y }) => {
    grid[y][x] = '.';
  });

  const floors = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (grid[y][x] === '.') floors.push({ x, y });
    }
  }

  const distances = distancesFrom(grid, start);
  const byDistance = [...floors].sort(
    (a, b) => (distances.get(positionKey(b)) ?? 0) - (distances.get(positionKey(a)) ?? 0),
  );
  const exit = byDistance[0];
  const available = floors.filter((position) =>
    !samePosition(position, start) && !samePosition(position, exit)
  );
  shuffle(available, random);
  const runes = available.splice(0, 3);
  const enemies = available.splice(0, 1 + (random() > 0.7 ? 1 : 0));

  grid[start.y][start.x] = 'P';
  grid[exit.y][exit.x] = 'X';
  runes.forEach(({ x, y }) => { grid[y][x] = 'R'; });
  enemies.forEach(({ x, y }) => { grid[y][x] = 'M'; });

  return grid.map((row) => row.join(''));
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function distancesFrom(grid, start) {
  const distances = new Map([[positionKey(start), 0]]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    const distance = distances.get(positionKey(current));
    for (const offset of [
      { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
    ]) {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      const key = positionKey(next);
      if (grid[next.y]?.[next.x] === '.' && !distances.has(key)) {
        distances.set(key, distance + 1);
        queue.push(next);
      }
    }
  }
  return distances;
}

const OFFSETS = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

const PATH_OFFSETS = [OFFSETS.up, OFFSETS.right, OFFSETS.down, OFFSETS.left];

export function positionKey(position) {
  return `${position.x},${position.y}`;
}

export function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function parseLevel(rows) {
  if (!rows.length) throw new Error('Level must contain at least one row.');
  const width = rows[0].length;
  if (!width || rows.some((row) => row.length !== width)) {
    throw new Error('Level rows must be non-empty and equal in width.');
  }

  const walls = new Set();
  const enemyStarts = [];
  const runeStarts = [];
  let playerStart;
  let exit;

  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      const position = { x, y };
      if (cell === '#') walls.add(positionKey(position));
      else if (cell === 'P') {
        if (playerStart) throw new Error('Level must contain exactly one player.');
        playerStart = position;
      } else if (cell === 'M') {
        enemyStarts.push({ id: `enemy-${enemyStarts.length + 1}`, position });
      } else if (cell === 'R') runeStarts.push(position);
      else if (cell === 'X') {
        if (exit) throw new Error('Level must contain exactly one exit.');
        exit = position;
      } else if (cell !== '.') throw new Error(`Unsupported level character: ${cell}`);
    });
  });

  if (!playerStart) throw new Error('Level is missing its player.');
  if (!exit) throw new Error('Level is missing its exit.');
  if (!runeStarts.length) throw new Error('Level must contain at least one rune.');

  return { width, height: rows.length, walls, playerStart, enemyStarts, runeStarts, exit };
}

export function isWalkable(level, position) {
  return position.x >= 0 && position.y >= 0 && position.x < level.width &&
    position.y < level.height && !level.walls.has(positionKey(position));
}

export function reachablePositions(level, start = level.playerStart) {
  const reached = new Set([positionKey(start)]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const offset of PATH_OFFSETS) {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      const key = positionKey(next);
      if (isWalkable(level, next) && !reached.has(key)) {
        reached.add(key);
        queue.push(next);
      }
    }
  }
  return reached;
}

export function validateLevel(level) {
  const reachable = reachablePositions(level);
  const objectives = [...level.runeStarts, level.exit];
  return objectives.some((position) => !reachable.has(positionKey(position)))
    ? ['All runes and the exit must be reachable from the player start.']
    : [];
}

export function createGame(level) {
  return {
    level,
    player: level.playerStart,
    enemies: level.enemyStarts,
    runes: level.runeStarts,
    collectedRunes: 0,
    health: 3,
    turn: 0,
    status: 'playing',
    events: [],
  };
}

export function takeTurn(state, direction) {
  if (state.status !== 'playing') return state;
  const offset = OFFSETS[direction];
  const target = { x: state.player.x + offset.x, y: state.player.y + offset.y };
  const enemyBlocked = state.enemies.some((enemy) => samePosition(enemy.position, target));
  if (!isWalkable(state.level, target) || enemyBlocked) return { ...state, events: [] };

  const events = [{ type: 'player-moved', from: state.player, to: target }];
  const runes = state.runes.filter((rune) => !samePosition(rune, target));
  const collectedNow = state.runes.length - runes.length;
  const collectedRunes = state.collectedRunes + collectedNow;
  if (collectedNow) events.push({ type: 'rune-collected', at: target });

  if (samePosition(target, state.level.exit) && collectedRunes === state.level.runeStarts.length) {
    return { ...state, player: target, runes, collectedRunes, turn: state.turn + 1,
      status: 'won', events: [...events, { type: 'game-won' }] };
  }

  const result = advanceEnemies(state.level, state.enemies, target, state.health);
  events.push(...result.events);
  const status = result.health <= 0 ? 'lost' : 'playing';
  if (status === 'lost') events.push({ type: 'game-lost' });
  return { ...state, player: target, enemies: result.enemies, runes, collectedRunes,
    health: result.health, turn: state.turn + 1, status, events };
}

function advanceEnemies(level, enemies, player, startingHealth) {
  const moved = [];
  const events = [];
  let health = startingHealth;
  for (const enemy of enemies) {
    if (manhattan(enemy.position, player) === 1) {
      health = Math.max(0, health - 1);
      events.push({ type: 'player-damaged', enemyId: enemy.id, health });
      moved.push(enemy);
      continue;
    }
    const blocked = new Set([
      ...moved.map((item) => positionKey(item.position)),
      ...enemies.filter((item) => item.id !== enemy.id).map((item) => positionKey(item.position)),
      positionKey(player),
    ]);
    const next = nextPathStep(level, enemy.position, player, blocked);
    moved.push({ ...enemy, position: next });
    if (!samePosition(next, enemy.position)) {
      events.push({ type: 'enemy-moved', enemyId: enemy.id, from: enemy.position, to: next });
    }
  }
  return { enemies: moved, health, events };
}

function nextPathStep(level, start, target, blocked) {
  const startKey = positionKey(start);
  const queue = [start];
  const visited = new Set([startKey]);
  const previous = new Map();
  const positions = new Map([[startKey, start]]);
  let foundKey;

  while (queue.length && !foundKey) {
    const current = queue.shift();
    for (const offset of PATH_OFFSETS) {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      const key = positionKey(next);
      if (samePosition(next, target)) {
        previous.set(key, positionKey(current));
        positions.set(key, next);
        foundKey = key;
        break;
      }
      if (isWalkable(level, next) && !blocked.has(key) && !visited.has(key)) {
        visited.add(key);
        previous.set(key, positionKey(current));
        positions.set(key, next);
        queue.push(next);
      }
    }
  }
  if (!foundKey) return start;
  let cursor = foundKey;
  while (previous.get(cursor) && previous.get(cursor) !== startKey) cursor = previous.get(cursor);
  return positions.get(cursor) ?? start;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
