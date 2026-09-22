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

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const data = body as {
    turns?: unknown;
    health?: unknown;
  };

  const turns = Number(data.turns);
  const health = Number(data.health);

  if (!Number.isInteger(turns) || turns < 1 || turns > 10000) {
    return json({ ok: false, error: 'Invalid turn count' }, 400);
  }

  if (!Number.isInteger(health) || health < 1 || health > 3) {
    return json({ ok: false, error: 'Invalid health value' }, 400);
  }

  const completedAt = new Date();
  const etDate = getEasternDateKey(completedAt);

  await env.eddiesgames_scores
    .prepare(
      `
      INSERT INTO crypt_shift_scores
        (et_date, turns, health, completed_at)
      VALUES (?, ?, ?, ?)
      `,
    )
    .bind(etDate, turns, health, completedAt.toISOString())
    .run();

  return json({
    ok: true,
    entry: {
      etDate,
      turns,
      health,
      completedAt: completedAt.toISOString(),
    },
  });
};
