export const prerender = false;

function getDb(locals) {
  return locals?.runtime?.env?.DB;
}

function getEasternDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET({ request, locals }) {
  const db = getDb(locals);

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

  const result = await db
    .prepare(
      `
      SELECT elapsed_ms, clue_count, puzzle_seed, created_at
      FROM sudoku_scores
      WHERE et_date = ?
      ORDER BY elapsed_ms ASC, created_at ASC
      LIMIT 3
      `,
    )
    .bind(etDate)
    .all();

  return new Response(
    JSON.stringify({
      etDate,
      scores: result.results ?? [],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
