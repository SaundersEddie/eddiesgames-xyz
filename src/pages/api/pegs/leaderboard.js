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

export async function GET({ request }) {
  const db = env.eddiesgames_scores;

  if (!db) {
    return new Response(
      JSON.stringify({ error: 'DB not available', scores: [] }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const url = new URL(request.url);
  const etDate = url.searchParams.get('etDate') || getEasternDateString();
  const boardId = url.searchParams.get('boardId') || 'triangle-15';

  const result = await db
    .prepare(
      `
      SELECT
        pegs_remaining,
        moves,
        elapsed_ms,
        starting_empty_hole,
        created_at
      FROM pegs_scores
      WHERE et_date = ? AND board_id = ?
      ORDER BY
        pegs_remaining ASC,
        moves ASC,
        elapsed_ms ASC,
        created_at ASC
      LIMIT 3
      `,
    )
    .bind(etDate, boardId)
    .all();

  return new Response(
    JSON.stringify({
      etDate,
      boardId,
      scores: result.results ?? [],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
