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
      JSON.stringify({ error: 'DB not available', results: [] }),
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
      SELECT attempts, COUNT(*) AS total
      FROM letterlock_scores
      WHERE et_date = ?
      GROUP BY attempts
      ORDER BY attempts ASC
      `,
    )
    .bind(etDate)
    .all();

  return new Response(
    JSON.stringify({
      etDate,
      results: result.results ?? [],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
