import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadTop5,
  submitScore,
} from '../../public/games/crypt-shift/cryptShiftLeaderboard.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Crypt Shift leaderboard', () => {
  it('loads the daily top five', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        etDate: '2026-09-22',
        entries: [
          {
            turns: 27,
            health: 3,
            completedAt: '2026-09-22T12:00:00.000Z',
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadTop5('2026-09-22');

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].turns).toBe(27);
    expect(result.entries[0].health).toBe(3);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/crypt-shift/leaderboard?etDate=2026-09-22',
      { cache: 'no-store' },
    );
  });

  it('submits turns and remaining health', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        entry: {
          etDate: '2026-09-22',
          turns: 31,
          health: 2,
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await submitScore({
      turns: 31,
      health: 2,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/crypt-shift/submit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turns: 31,
          health: 2,
        }),
      },
    );
  });
});
