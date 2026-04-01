import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const db = locals.runtime.env.DB;

    // 🔴 IMPORTANT: handle local dev
  if (!db) {
    return Response.json({
      ok: true,
      entries: [],
      note: 'DB not available in local dev'
    });
  }
  
  const etDate = url.searchParams.get('etDate');
  const mode = url.searchParams.get('mode');

  if (!etDate || !mode) {
    return Response.json(
      { ok: false, error: 'Missing etDate or mode' },
      { status: 400 }
    );
  }

  const result = await db.prepare(`
    SELECT time_ms, moves, completed_at
    FROM match_scores
    WHERE et_date = ? AND mode = ?
    ORDER BY time_ms ASC, moves ASC, completed_at ASC
    LIMIT 3
  `)
  .bind(etDate, mode)
  .all();

  return Response.json({
    ok: true,
    entries: result.results ?? []
  });
};
