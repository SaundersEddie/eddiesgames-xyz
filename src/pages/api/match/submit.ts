import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;

  // local dev fallback
  if (!db) {
    return Response.json({
      ok: true,
      note: 'DB not available in local dev'
    });
  }

  try {
    const body = await request.json();

    const etDate = body?.etDate;
    const mode = body?.mode;
    const timeMs = Number(body?.timeMs);
    const moves = Number(body?.moves);
    const completedAt = Number(body?.completedAt ?? Date.now());

    if (
      !etDate ||
      !mode ||
      !Number.isFinite(timeMs) ||
      !Number.isFinite(moves)
    ) {
      return Response.json(
        { ok: false, error: 'Invalid payload' },
        { status: 400 }
      );
    }

    await db.prepare(`
      INSERT INTO match_scores (et_date, mode, time_ms, moves, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(etDate, mode, timeMs, moves, completedAt)
    .run();

    return Response.json({ ok: true });

  } catch (err) {
    return Response.json(
      { ok: false, error: 'Insert failed' },
      { status: 500 }
    );
  }
};
