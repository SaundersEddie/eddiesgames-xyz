import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

type MatchSubmitBody = {
  etDate?: string;
  mode?: string;
  timeMs?: number | string;
  moves?: number | string;
  completedAt?: number | string;
};

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as MatchSubmitBody;

  const etDate = body.etDate;
  const mode = body.mode;
  const timeMs = Number(body.timeMs);
  const moves = Number(body.moves);
  const completedAt = Number(body.completedAt ?? Date.now());

  if (
    !etDate ||
    !mode ||
    !Number.isFinite(timeMs) ||
    !Number.isFinite(moves) ||
    !Number.isFinite(completedAt)
  ) {
    return Response.json(
      { ok: false, error: 'Invalid payload' },
      { status: 400 },
    );
  }

  await env.eddiesgames_scores
    .prepare(
      `
    INSERT INTO match_scores (et_date, mode, time_ms, moves, completed_at)
    VALUES (?, ?, ?, ?, ?)
    `,
    )
    .bind(etDate, mode, Math.floor(timeMs), Math.floor(moves), completedAt)
    .run();

  return Response.json({ ok: true });
};
