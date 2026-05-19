import { env } from 'cloudflare:workers';

export const prerender = false;

function getEasternDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isValidPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

export async function POST({ request }) {
  const db = env.eddiesgames_scores;

  if (!db) {
    return new Response(
      JSON.stringify({ error: 'DB not available', saved: false }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const elapsedMs = Number(body.elapsedMs);
  const clueCount = Number(body.clueCount);
  const puzzleSeed = String(body.puzzleSeed || '').trim();
  const etDate = getEasternDateString();

  if (!isValidPositiveInteger(elapsedMs)) {
    return new Response(JSON.stringify({ error: 'Invalid elapsedMs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (elapsedMs < 1000 || elapsedMs > 24 * 60 * 60 * 1000) {
    return new Response(JSON.stringify({ error: 'Elapsed time out of range' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isValidPositiveInteger(clueCount) || clueCount < 5 || clueCount > 81) {
    return new Response(JSON.stringify({ error: 'Invalid clueCount' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!puzzleSeed || puzzleSeed.length > 120) {
    return new Response(JSON.stringify({ error: 'Invalid puzzleSeed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db
    .prepare(
      `
      INSERT INTO sudoku_scores (et_date, elapsed_ms, clue_count, puzzle_seed)
      VALUES (?, ?, ?, ?)
      `,
    )
    .bind(etDate, elapsedMs, clueCount, puzzleSeed)
    .run();

  return new Response(
    JSON.stringify({
      saved: true,
      etDate,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}