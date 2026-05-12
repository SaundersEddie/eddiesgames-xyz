const API_BASE = '/api/react';

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
        points: Number(entry.points) || 0,
        completedAt: entry.completedAt,
      })),
    };
  } catch {
    return { etDate, entries: [] };
  }
}

export async function submitScore({ points }) {
  const res = await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });

  if (!res.ok) {
    throw new Error(`Reaction score submit failed: ${res.status}`);
  }

  const data = await res.json();
  const etDate = data?.entry?.etDate || getEtDateKey();

  return loadTop5(etDate);
}
