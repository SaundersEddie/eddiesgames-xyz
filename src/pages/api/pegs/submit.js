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

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
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

  const boardId = String(body.boardId || '').trim();
  const pegsRemaining = Number(body.pegsRemaining);
  const moves = Number(body.moves);
  const elapsedMs = Number(body.elapsedMs);
  const startingEmptyHole = Number(body.startingEmptyHole);
  const etDate = getEasternDateString();

  if (boardId !== 'triangle-15') {
    return new Response(JSON.stringify({ error: 'Invalid boardId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isIntegerInRange(pegsRemaining, 1, 14)) {
    return new Response(JSON.stringify({ error: 'Invalid pegsRemaining' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isIntegerInRange(moves, 1, 500)) {
    return new Response(JSON.stringify({ error: 'Invalid moves' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isIntegerInRange(elapsedMs, 1, 24 * 60 * 60 * 1000)) {
    return new Response(JSON.stringify({ error: 'Invalid elapsedMs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isIntegerInRange(startingEmptyHole, 0, 14)) {
    return new Response(JSON.stringify({ error: 'Invalid startingEmptyHole' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db
    .prepare(
      `
      INSERT INTO pegs_scores (
        et_date,
        board_id,
        pegs_remaining,
        moves,
        elapsed_ms,
        starting_empty_hole
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      etDate,
      boardId,
      pegsRemaining,
      moves,
      elapsedMs,
      startingEmptyHole,
    )
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
