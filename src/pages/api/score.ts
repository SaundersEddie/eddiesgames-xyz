export const prerender = false;

const GAME_TABLE: Record<string, string> = {
  redacted: 'redacted_scores',
  // add more later:
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

export async function POST({ request, locals }: any) {
  try {
    const body = await request.json().catch(() => ({}));
    const game = body?.game;
    const score = body?.score;

    if (typeof game !== 'string' || !(game in GAME_TABLE)) {
      return json({ ok: false, error: 'unsupported_game' }, 400);
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      return json({ ok: false, error: 'bad_score' }, 400);
    }

    const intScore = Math.floor(score);
    if (intScore < 1 || intScore > 99) {
      return json({ ok: false, error: 'score_out_of_range' }, 400);
    }

    const day = nyDay();
    const created_at = Date.now();
    const table = GAME_TABLE[game];

    const env = locals.runtime.env;

    // Table name cannot be bound as a parameter; we whitelist it above.
    await env.eddiesgames_scores
      .prepare(`INSERT INTO ${table} (day, score, created_at) VALUES (?, ?, ?)`)
      .bind(day, intScore, created_at)
      .run();

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'server_error' }, 500);
  }
}
