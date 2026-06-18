const API_BASE = '/api/letterlock';

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function getEtDateKey(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
}

export async function loadDailyResults(etDate = getEtDateKey()) {
  try {
    const res = await fetch(
      `${API_BASE}/leaderboard?etDate=${encodeURIComponent(etDate)}`,
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.entries)) return [];

    return data.entries.map((e) => ({
      attempts: e.attempts,
      total: e.total,
    }));
  } catch {
    return [];
  }
}

export async function submitScore({
  attempts,
  badGuesses,
  score,
  completedAt = Date.now(),
}) {
  const etDate = getEtDateKey(new Date(completedAt));

  await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      etDate,
      attempts,
      badGuesses,
      score,
      completedAt,
    }),
  });

  const entries = await loadDailyResults(etDate);

  return { etDate, entries };
}
