import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

function getEtDateKey(date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return fmt.format(date);
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

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const points = Number((body as { points?: unknown }).points);

  if (!Number.isInteger(points) || points < 0 || points > 999999) {
    return json({ ok: false, error: 'Invalid points value' }, 400);
  }

  const completedAt = new Date();
  const etDate = getEtDateKey(completedAt);

  await env.eddiesgames_scores
    .prepare(
      `
      INSERT INTO react_scores (et_date, points, completed_at)
      VALUES (?, ?, ?)
      `,
    )
    .bind(etDate, points, completedAt.toISOString())
    .run();

  return json({
    ok: true,
    entry: {
      etDate,
      points,
      completedAt: completedAt.toISOString(),
    },
  });
};
