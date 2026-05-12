import { getDb, initDb } from "../_db.js";

export default async function handler(req, res) {
  await initDb();
  const db = getDb();
  const { id } = req.query;

  if (req.method === "GET") {
    const [proj, entries] = await Promise.all([
      db.execute({ sql: "SELECT * FROM projects WHERE id = ?", args: [id] }),
      db.execute({ sql: "SELECT * FROM entries WHERE project_id = ? ORDER BY created_at DESC", args: [id] }),
    ]);
    if (!proj.rows.length) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ project: proj.rows[0], entries: entries.rows });
  }

  if (req.method === "PATCH") {
    const { name, description } = req.body;
    const fields = [], args = [];
    if (name !== undefined) { fields.push("name = ?"); args.push(name); }
    if (description !== undefined) { fields.push("description = ?"); args.push(description); }
    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });
    args.push(id);
    await db.execute({ sql: `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`, args });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.execute({ sql: "DELETE FROM projects WHERE id = ?", args: [id] });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
