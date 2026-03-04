export const prerender = false;

const GAME_TABLE: Record<string, string> = {
  redacted: 'redacted_scores',
  // reaction: "reaction_scores",
  // runner: "runner_scores",
};

function nyDay(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET({ url, locals }: any) {
  const game = url.searchParams.get('game') ?? 'redacted';
  if (!(game in GAME_TABLE))
    return json({ ok: false, error: 'unsupported_game' }, 400);

  const day = nyDay();
  const table = GAME_TABLE[game];
  const env = locals.runtime.env;

  const { results } = await env.eddiesgames_scores
    .prepare(
      `SELECT score
       FROM ${table}
       WHERE day = ?
       ORDER BY score ASC, created_at ASC
       LIMIT 5`,
    )
    .bind(day)
    .all();

  return json(results.map((r: any) => r.score));
}
