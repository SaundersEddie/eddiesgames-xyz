import type { APIRoute } from 'astro';

export const prerender = false;

type D1Result<T> = {
  results: T[];
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  run: () => Promise<unknown>;
  all: <T>() => Promise<D1Result<T>>;
};

type D1Db = {
  prepare: (query: string) => D1PreparedStatement;
};

type RuntimeLocals = {
  runtime?: {
    env?: {
      eddiesgames_scores?: D1Db;
    };
  };
};

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

export const GET: APIRoute = async ({ url, locals }) => {
  const db = (locals as RuntimeLocals).runtime?.env?.eddiesgames_scores;

  if (!db) {
    return json({ ok: false, error: 'D1 binding not available' }, 500);
  }

  const requestedDate = url.searchParams.get('etDate');
  const etDate = requestedDate || getEtDateKey();

  const result = await db
    .prepare(
      `
      SELECT score, completed_at
      FROM sequence_scores
      WHERE et_date = ?
      ORDER BY score DESC, completed_at ASC
      LIMIT 5
    `,
    )
    .bind(etDate)
    .all<{
      score: number;
      completed_at: string;
    }>();

  return json({
    ok: true,
    etDate,
    entries: result.results.map((row) => ({
      score: row.score,
      completedAt: row.completed_at,
    })),
  });
};
