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

  const score = Number((body as { score?: unknown }).score);

  if (!Number.isInteger(score) || score < 0 || score > 999999) {
    return json({ ok: false, error: 'Invalid score value' }, 400);
  }

  const completedAt = new Date();
  const etDate = getEtDateKey(completedAt);

  await env.eddiesgames_scores
    .prepare(
      `
      INSERT INTO sequence_scores (et_date, score, completed_at)
      VALUES (?, ?, ?)
      `,
    )
    .bind(etDate, score, completedAt.toISOString())
    .run();

  return json({
    ok: true,
    entry: {
      etDate,
      score,
      completedAt: completedAt.toISOString(),
    },
  });
};
