import { getEasternDateKey } from './cryptShiftRules.js';

const API_BASE = '/api/crypt-shift';

export async function loadTop5(etDate = getEasternDateKey()) {
  const response = await fetch(
    `${API_BASE}/leaderboard?etDate=${encodeURIComponent(etDate)}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error(`Leaderboard failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    etDate: data.etDate ?? etDate,
    entries: Array.isArray(data.entries) ? data.entries : [],
  };
}

export async function submitScore({ turns, health }) {
  const response = await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ turns, health }),
  });

  if (!response.ok) {
    throw new Error(`Score submission failed: ${response.status}`);
  }

  return response.json();
}
