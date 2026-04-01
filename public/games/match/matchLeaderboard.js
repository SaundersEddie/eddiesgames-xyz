const API_BASE = '/api/match';

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

// export async function loadTop3(mode, etDate = getEtDateKey()) {
//   try {
//     const res = await fetch(
//       `${API_BASE}/leaderboard?mode=${mode}&etDate=${etDate}`
//     );
//     const data = await res.json();
//     return data.entries || [];
//   } catch {
//     return [];
//   }
// }
export async function loadTop3(mode, etDate = getEtDateKey()) {
  try {
    const res = await fetch(
      `${API_BASE}/leaderboard?mode=${encodeURIComponent(mode)}&etDate=${encodeURIComponent(etDate)}`,
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.entries)) return [];

    return data.entries.map((e) => ({
      timeMs: e.time_ms,
      moves: e.moves,
      completedAt: e.completed_at,
    }));
  } catch {
    return [];
  }
}

export async function submitScore({
  mode,
  timeMs,
  moves,
  completedAt = Date.now(),
}) {
  const etDate = getEtDateKey(new Date(completedAt));

  await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      etDate,
      mode,
      timeMs,
      moves,
      completedAt,
    }),
  });

  const entries = await loadTop3(mode, etDate);

  return { etDate, top3: entries };
}

export function formatTimeMs(ms) {
  const clamped = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(clamped / 60000);
  const rem = clamped % 60000;
  const seconds = Math.floor(rem / 1000);
  const millis = rem % 1000;
  return `${pad2(minutes)}:${pad2(seconds)}.${String(millis).padStart(3, '0')}`;
}
