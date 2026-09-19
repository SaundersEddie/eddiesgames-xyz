import { describe, expect, it } from 'vitest';
import {
  FIXED_ROOM, createGame, generateRoomFromSeed, getEasternDateKey, parseLevel,
  positionKey, reachablePositions, takeTurn, validateLevel,
} from '../../public/games/crypt-shift/cryptShiftRules.js';

const gameFrom = (rows) => createGame(parseLevel(rows));

describe('Crypt Shift levels', () => {
  it('parses and validates the fixed room', () => {
    const level = parseLevel(FIXED_ROOM);
    expect(level.width).toBe(12);
    expect(level.runeStarts).toHaveLength(3);
    expect(level.enemyStarts).toHaveLength(1);
    expect(validateLevel(level)).toEqual([]);
    const reachable = reachablePositions(level);
    expect(reachable.has(positionKey(level.exit))).toBe(true);
  });

  it('rejects malformed maps', () => {
    expect(() => parseLevel(['###', '#P#'])).toThrow(/exit/i);
    expect(() => parseLevel(['####', '#PX#', '###'])).toThrow(/equal in width/i);
  });

  it('reports unreachable objectives', () => {
    const level = parseLevel(['#######', '#P#R#X#', '#######']);
    expect(validateLevel(level)).toHaveLength(1);
  });
});

describe('Crypt Shift daily generation', () => {
  it('creates the same room from the same date seed', () => {
    expect(generateRoomFromSeed('2026-09-19')).toEqual(
      generateRoomFromSeed('2026-09-19'),
    );
  });

  it('creates different rooms for consecutive date seeds', () => {
    expect(generateRoomFromSeed('2026-09-19')).not.toEqual(
      generateRoomFromSeed('2026-09-20'),
    );
  });

  it('uses the Eastern date', () => {
    expect(getEasternDateKey(new Date('2026-09-19T03:00:00Z'))).toBe('2026-09-18');
  });

  it('generates valid solvable rooms across 1000 seeds', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const rows = generateRoomFromSeed(`test-${seed}`);
      const level = parseLevel(rows);
      expect(level.runeStarts).toHaveLength(3);
      expect(level.enemyStarts.length).toBeGreaterThanOrEqual(1);
      expect(validateLevel(level)).toEqual([]);
    }
  });
});

describe('Crypt Shift turns', () => {
  it('does not spend a turn against a wall', () => {
    const game = gameFrom(['#####', '#PRX#', '#####']);
    expect(takeTurn(game, 'up').turn).toBe(0);
  });

  it('moves and spends one turn', () => {
    const next = takeTurn(gameFrom(['######', '#P.RX#', '######']), 'right');
    expect(next.player).toEqual({ x: 2, y: 1 });
    expect(next.turn).toBe(1);
  });

  it('collects a rune', () => {
    const next = takeTurn(gameFrom(['#####', '#PRX#', '#####']), 'right');
    expect(next.collectedRunes).toBe(1);
    expect(next.runes).toHaveLength(0);
  });

  it('wins only after collecting every rune', () => {
    const game = gameFrom(['#####', '#PRX#', '#####']);
    const won = takeTurn(takeTurn(game, 'right'), 'right');
    expect(won.status).toBe('won');
  });

  it('moves an enemy deterministically', () => {
    const game = gameFrom(['########', '#P...MR#', '#.....X#', '########']);
    const next = takeTurn(game, 'down');
    expect(next.enemies[0].position).toEqual({ x: 5, y: 2 });
  });

  it('damages and can defeat the player', () => {
    const game = gameFrom(['#######', '#P..RX#', '#.M...#', '#######']);
    const lost = takeTurn({ ...game, health: 1 }, 'down');
    expect(lost.health).toBe(0);
    expect(lost.status).toBe('lost');
  });
});
