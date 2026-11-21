export const FX_SLOTS = ["Fixture graphic", "Team sheet", "Starting line up", "Full time score", "POTM", "Lynnos Star"];

// Legacy slot names -> canonical slots (SPS Ladies matchday set).
const FX_MAP: Record<string, string> = {
  matchday: "Fixture graphic",
  "fixture graphic": "Fixture graphic",
  "team news": "Team sheet",
  "team sheet": "Team sheet",
  "starting xi": "Starting line up",
  "starting lineup": "Starting line up",
  "starting line up": "Starting line up",
  "full time": "Full time score",
  "full time result": "Full time score",
  "full-time result": "Full time score",
  "full time score": "Full time score",
  "half-time score": "Full time score",
  result: "Full time score",
  pom: "POTM",
  potm: "POTM",
  "lynnos star": "Lynnos Star",
};

// Returns the fixture graphics array in canonical slot order, folding any
// legacy-named entries into their new slots without losing files/text.
export function normalizeGraphics(input: unknown): { name: string; done: boolean; url?: string | null; path?: string; fileName?: string; text?: string; by?: string }[] {
  const out: { name: string; done: boolean; url?: string | null; path?: string; fileName?: string; text?: string; by?: string }[] = FX_SLOTS.map((name) => ({ name, done: false }));
  const arr = Array.isArray(input) ? (input as Any[]) : [];
  for (const x of arr) {
    if (!x || typeof x !== "object" || !x.name) continue;
    const target = FX_MAP[String(x.name).toLowerCase().trim()];
    const i = target ? out.findIndex((s) => s.name === target) : -1;
    if (i >= 0) {
      const cur = out[i];
      out[i] = { ...cur, ...x, name: cur.name, done: !!(x.done || cur.done) };
      if (cur.path && !x.path) out[i].path = cur.path;
      if (cur.text && !x.text) out[i].text = cur.text;
    } else {
      out.push({ ...x });
    }
  }
  return out;
}

type Any = any;
