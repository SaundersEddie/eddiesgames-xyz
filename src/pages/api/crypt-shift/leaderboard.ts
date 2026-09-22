import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

function getEasternDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const requestedDate = url.searchParams.get('etDate');
  const etDate = requestedDate || getEasternDateKey();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(etDate)) {
    return json({ ok: false, error: 'Invalid date' }, 400);
  }

  const result = await env.eddiesgames_scores
    .prepare(
      `
      SELECT turns, health, completed_at
      FROM crypt_shift_scores
      WHERE et_date = ?
      ORDER BY turns ASC, health DESC, completed_at ASC
      LIMIT 5
      `,
    )
    .bind(etDate)
    .all<{
      turns: number;
      health: number;
      completed_at: string;
    }>();

  return json({
    ok: true,
    etDate,
    entries: result.results.map((entry) => ({
      turns: entry.turns,
      health: entry.health,
      completedAt: entry.completed_at,
    })),
  });
};
