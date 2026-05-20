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

  const data = body as {
    score?: unknown;
    bestTile?: unknown;
    moves?: unknown;
  };

  const score = Number(data.score);
  const bestTile = Number(data.bestTile);
  const moves = Number(data.moves);

  if (!Number.isInteger(score) || score < 0 || score > 999999999) {
    return json({ ok: false, error: 'Invalid score value' }, 400);
  }

  if (!Number.isInteger(bestTile) || bestTile < 0 || bestTile > 1048576) {
    return json({ ok: false, error: 'Invalid bestTile value' }, 400);
  }

  if (!Number.isInteger(moves) || moves < 0 || moves > 999999) {
    return json({ ok: false, error: 'Invalid moves value' }, 400);
  }

  const completedAt = new Date();
  const etDate = getEtDateKey(completedAt);

  await env.eddiesgames_scores
    .prepare(
      `
      INSERT INTO shift_scores (et_date, score, best_tile, moves, completed_at)
      VALUES (?, ?, ?, ?, ?)
      `,
    )
    .bind(etDate, score, bestTile, moves, completedAt.toISOString())
    .run();

  return json({
    ok: true,
    entry: {
      etDate,
      score,
      bestTile,
      moves,
      completedAt: completedAt.toISOString(),
    },
  });
};
