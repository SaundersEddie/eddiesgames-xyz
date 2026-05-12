const API_BASE = '/api/shift';

export function getEtDateKey(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return fmt.format(date);
}

export async function loadTop5(etDate = getEtDateKey()) {
  try {
    const res = await fetch(
      `${API_BASE}/leaderboard?etDate=${encodeURIComponent(etDate)}`,
      { cache: 'no-store' },
    );

    if (!res.ok) return { etDate, entries: [] };

    const data = await res.json();

    if (!data?.ok || !Array.isArray(data.entries)) {
      return { etDate, entries: [] };
    }

    return {
      etDate: data.etDate || etDate,
      entries: data.entries.map((entry) => ({
        score: Number(entry.score) || 0,
        bestTile: Number(entry.bestTile) || 0,
        moves: Number(entry.moves) || 0,
        completedAt: entry.completedAt,
      })),
    };
  } catch {
    return { etDate, entries: [] };
  }
}

export async function submitScore({ score, bestTile, moves }) {
  const res = await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, bestTile, moves }),
  });

  if (!res.ok) {
    throw new Error(`Shift score submit failed: ${res.status}`);
  }

  const data = await res.json();
  const etDate = data?.entry?.etDate || getEtDateKey();

  return loadTop5(etDate);
}
