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

export const GET: APIRoute = async ({ url }) => {
  const requestedDate = url.searchParams.get('etDate');
  const etDate = requestedDate || getEtDateKey();

  const result = await env.eddiesgames_scores
    .prepare(
      `
      SELECT score, best_tile, moves, completed_at
      FROM shift_scores
      WHERE et_date = ?
      ORDER BY score DESC, best_tile DESC, moves ASC, completed_at ASC
      LIMIT 5
      `,
    )
    .bind(etDate)
    .all<{
      score: number;
      best_tile: number;
      moves: number;
      completed_at: string;
    }>();

  return json({
    ok: true,
    etDate,
    entries: result.results.map((row) => ({
      score: row.score,
      bestTile: row.best_tile,
      moves: row.moves,
      completedAt: row.completed_at,
    })),
  });
};
