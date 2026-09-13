import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

type DungeonDashSubmitBody = {
  etDate?: string;
  timeMs?: number | string;
  caught?: number | string;
  meanies?: number | string;
  completedAt?: number | string;
};

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as DungeonDashSubmitBody;

  const etDate = body.etDate;
  const timeMs = Number(body.timeMs);
  const caught = Number(body.caught);
  const meanies = Number(body.meanies);
  const completedAt = Number(body.completedAt ?? Date.now());

  if (
    !etDate ||
    !Number.isFinite(timeMs) ||
    !Number.isFinite(caught) ||
    !Number.isFinite(meanies) ||
    !Number.isFinite(completedAt)
  ) {
    return Response.json(
      { ok: false, error: 'Invalid payload' },
      { status: 400 }
    );
  }

  await env.eddiesgames_scores
    .prepare(
      `
      INSERT INTO dungeon_dash_scores
        (et_date, time_ms, caught, meanies, completed_at)
      VALUES (?, ?, ?, ?, ?)
      `
    )
    .bind(
      etDate,
      Math.floor(timeMs),
      Math.floor(caught),
      Math.floor(meanies),
      completedAt
    )
    .run();

  return Response.json({ ok: true });
};
