// One-off: shrink oversized images in the `files` storage bucket in place.
// Originals are preserved under _originals/<path>. Re-uploads use the same
// object path, so stored URLs / signed-URL references keep working.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = (await import("sharp")).default;

const URL_BASE = process.env.SUPABASE_URL.replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "files";
const MIN_BYTES = 800 * 1024; // only bother with files > 800 KB
const MAX_EDGE = 2400;
const QUALITY = 86;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function listAll(prefix = "") {
  const out = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, offset, bySize: true }),
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const row of rows) {
      if (row.id === null) {
        // folder — recurse
        out.push(...(await listAll(row.name.endsWith("/") ? row.name : `${prefix}${row.name}/`)));
      } else {
        out.push({ path: `${prefix}${row.name}`, size: row.metadata?.size ?? 0 });
      }
    }
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return out;
}

async function upload(path, buffer, contentType) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "3600" },
    body: buffer,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${res.status} ${await res.text()}`);
}

const objects = (await listAll("")).filter((o) => {
  const lower = o.path.toLowerCase();
  return (
    o.size >= MIN_BYTES &&
    !o.path.startsWith("_originals/") &&
    (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png"))
  );
});
console.log(`Found ${objects.length} oversized image(s) to compress.`);

let saved = 0;
for (const o of objects) {
  const get = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${o.path}`, { headers });
  if (!get.ok) { console.error(`skip ${o.path}: GET ${get.status}`); continue; }
  const original = Buffer.from(await get.arrayBuffer());
  const contentType = get.headers.get("content-type") || "image/jpeg";

  // keep a pristine copy
  await upload(`_originals/${o.path}`, original, contentType);

  const resized = await sharp(original)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();

  await upload(o.path, resized, "image/jpeg");
  saved += original.length - resized.length;
  console.log(`${o.path}: ${(original.length / 1e6).toFixed(2)} MB -> ${(resized.length / 1e6).toFixed(2)} MB`);
}
console.log(`Done. Saved ${(saved / 1e6).toFixed(2)} MB (${(saved / 1e6 / 1.048576).toFixed(2)} MiB).`);
