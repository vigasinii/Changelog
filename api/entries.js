import { getDb, initDb } from "./_db.js";

export default async function handler(req, res) {
  await initDb();
  const db = getDb();

  if (req.method === "POST") {
    const { project_id, version, title, body, type = "minor" } = req.body;
    if (!project_id || !version || !title || !body)
      return res.status(400).json({ error: "project_id, version, title, body required" });

    const result = await db.execute({
      sql: "INSERT INTO entries (project_id, version, title, body, type) VALUES (?, ?, ?, ?, ?)",
      args: [project_id, version, title, body, type],
    });
    return res.status(201).json({ id: Number(result.lastInsertRowid) });
  }

  res.status(405).json({ error: "Method not allowed" });
}
