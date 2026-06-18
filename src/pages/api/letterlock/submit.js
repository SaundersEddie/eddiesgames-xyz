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

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : NaN;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST({ request }) {
  const db = env.eddiesgames_scores;

  if (!db) {
    return json({ error: 'DB not available', saved: false }, 200);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON', saved: false }, 400);
  }

  const attempts = toNumber(
    body.attempts ?? body.attemptsUsed ?? body.moves,
  );

  const badGuesses = toNumber(
    body.badGuesses ?? body.bad_guesses ?? body.badGuessesUsed ?? 0,
  );

  const score = toNumber(body.score ?? 0);

  const etDate = getEasternDateString();

  const puzzleSeed = String(
    body.puzzleSeed ?? body.puzzle_seed ?? body.seed ?? etDate,
  ).trim();

  if (!Number.isInteger(attempts) || attempts <= 0 || attempts > 200) {
    return json(
      {
        error: 'Invalid attempts',
        saved: false,
        received: body,
      },
      400,
    );
  }

  if (!Number.isInteger(badGuesses) || badGuesses < 0 || badGuesses > 10) {
    return json(
      {
        error: 'Invalid badGuesses',
        saved: false,
        received: body,
      },
      400,
    );
  }

  if (!Number.isInteger(score) || score < 0 || score > 9999) {
    return json(
      {
        error: 'Invalid score',
        saved: false,
        received: body,
      },
      400,
    );
  }

  await db
    .prepare(
      `
      INSERT INTO letterlock_scores (
        et_date,
        attempts,
        bad_guesses,
        score,
        puzzle_seed
      )
      VALUES (?, ?, ?, ?, ?)
      `,
    )
    .bind(etDate, attempts, badGuesses, score, puzzleSeed)
    .run();

  return json({
    saved: true,
    etDate,
  });
}
