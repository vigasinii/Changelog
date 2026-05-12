import { getDb, initDb } from "../_db.js";

export default async function handler(req, res) {
  await initDb();
  const db = getDb();
  const { id } = req.query;

  if (req.method === "PATCH") {
    const { version, title, body, type, published } = req.body;
    const fields = [], args = [];
    if (version   !== undefined) { fields.push("version = ?");   args.push(version); }
    if (title     !== undefined) { fields.push("title = ?");     args.push(title); }
    if (body      !== undefined) { fields.push("body = ?");      args.push(body); }
    if (type      !== undefined) { fields.push("type = ?");      args.push(type); }
    if (published !== undefined) {
      fields.push("published = ?");
      args.push(published ? 1 : 0);
      fields.push("published_at = ?");
      args.push(published ? new Date().toISOString() : null);
    }
    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });
    args.push(id);
    await db.execute({ sql: `UPDATE entries SET ${fields.join(", ")} WHERE id = ?`, args });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.execute({ sql: "DELETE FROM entries WHERE id = ?", args: [id] });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
