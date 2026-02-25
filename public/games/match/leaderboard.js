const STORAGE_PREFIX = "match";

function pad2(n){ return String(n).padStart(2, "0"); }

export function getEtDateKey(date = new Date()){
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

function keyFor(mode, etDate){
  return `${STORAGE_PREFIX}:${etDate}:${mode}`;
}

export function loadTop3(mode, etDate = getEtDateKey()){
  const key = keyFor(mode, etDate);
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return [];
    const data = JSON.parse(raw);
    if(!Array.isArray(data)) return [];
    return data;
  }catch{
    return [];
  }
}

export function submitScore({ mode, timeMs, moves, completedAt = Date.now() }){
  const etDate = getEtDateKey(new Date(completedAt));
  const key = keyFor(mode, etDate);

  const entry = { timeMs, moves, completedAt };

  const current = loadTop3(mode, etDate);
  const merged = [...current, entry];

  merged.sort((a,b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;      // lowest time first
    if (a.moves !== b.moves) return a.moves - b.moves;          // tie-breaker: lowest moves
    return a.completedAt - b.completedAt;                       // final tie: earliest completion
  });

  const top3 = merged.slice(0, 3);
  localStorage.setItem(key, JSON.stringify(top3));
  return { etDate, top3 };
}

export function formatTimeMs(ms){
  const clamped = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(clamped / 60000);
  const rem = clamped % 60000;
  const seconds = Math.floor(rem / 1000);
  const millis = rem % 1000;
  return `${pad2(minutes)}:${pad2(seconds)}.${String(millis).padStart(3,"0")}`;
}