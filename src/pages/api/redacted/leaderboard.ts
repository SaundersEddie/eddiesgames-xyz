import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

function getEtDateKey(date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return fmt.format(date);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const requestedDate = url.searchParams.get('etDate');
  const etDate = requestedDate || getEtDateKey();

  const result = await env.eddiesgames_scores
    .prepare(
      `
      SELECT guesses, COUNT(*) AS total
      FROM redacted_scores
      WHERE et_date = ?
      GROUP BY guesses
      ORDER BY guesses ASC
      `,
    )
    .bind(etDate)
    .all<{
      guesses: number;
      total: number;
    }>();

  return json({
    ok: true,
    etDate,
    entries: result.results.map((row) => ({
      guesses: row.guesses,
      total: row.total,
    })),
  });
};
