import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const etDate = url.searchParams.get('etDate');
  const mode = url.searchParams.get('mode');

  if (!etDate || !mode) {
    return Response.json(
      { ok: false, error: 'Missing etDate or mode' },
      { status: 400 },
    );
  }

  const result = await env.eddiesgames_scores.prepare(
    `
    SELECT time_ms, moves, completed_at
    FROM match_scores
    WHERE et_date = ? AND mode = ?
    ORDER BY time_ms ASC, moves ASC, completed_at ASC
    LIMIT 3
    `,
  )
    .bind(etDate, mode)
    .all();

  return Response.json({
    ok: true,
    entries: result.results ?? [],
  });
};
