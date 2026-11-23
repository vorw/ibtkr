// Small challenge sketches use the existing bound database, without new
// credentials or production storage bindings. Image bodies are read separately
// from the feed and have a strict 180 KB cap in drawing-policy.ts.
export async function ensureDrawingSchema(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS idea_drawings (
    idea_id text PRIMARY KEY NOT NULL REFERENCES ideas(id),
    image_data text NOT NULL,
    revision text NOT NULL
  )`,
    )
    .run();
}
export async function drawingRevision(data: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
