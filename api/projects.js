import { getDb, initDb } from "./_db.js";

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default async function handler(req, res) {
  await initDb();
  const db = getDb();

  if (req.method === "GET") {
    const result = await db.execute(
      `SELECT p.*, COUNT(e.id) as entry_count,
        SUM(CASE WHEN e.published = 1 THEN 1 ELSE 0 END) as published_count
       FROM projects p
       LEFT JOIN entries e ON e.project_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    return res.status(200).json({ projects: result.rows });
  }

  if (req.method === "POST") {
    const { name, description = "" } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const slug = slugify(name) + "-" + Date.now().toString(36);
    const result = await db.execute({
      sql: "INSERT INTO projects (name, slug, description) VALUES (?, ?, ?)",
      args: [name, slug, description],
    });
    return res.status(201).json({ id: Number(result.lastInsertRowid), slug });
  }

  res.status(405).json({ error: "Method not allowed" });
}
