import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const etDate = url.searchParams.get('etDate');

  if (!etDate) {
    return Response.json(
      { ok: false, error: 'Missing etDate' },
      { status: 400 }
    );
  }

  const result = await env.eddiesgames_scores
    .prepare(
      `
      SELECT time_ms, caught, meanies, completed_at
      FROM dungeon_dash_scores
      WHERE et_date = ?
      ORDER BY time_ms ASC, completed_at ASC
      LIMIT 5
      `
    )
    .bind(etDate)
    .all();

  return Response.json({
    ok: true,
    entries: result.results ?? []
  });
};
