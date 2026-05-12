import { getDb, initDb } from "./_db.js";

function typeColor(type) {
  return { major: "#7c3aed", minor: "#6d28d9", patch: "#8b5cf6", fix: "#a78bfa" }[type] || "#7c3aed";
}
function typeLabel(type) {
  return { major: "Major", minor: "Minor", patch: "Patch", fix: "Fix" }[type] || type;
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function renderMarkdown(text) {
  // Simple markdown: bold, italic, inline code, code blocks, headers, lists, links
  return text
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupocl])(.+)$/gm, (m) => m.trim() ? m : '')
    .trim();
}

export default async function handler(req, res) {
  await initDb();
  const db = getDb();
  const { slug } = req.query;

  const projResult = await db.execute({
    sql: "SELECT * FROM projects WHERE slug = ?",
    args: [slug],
  });
  if (!projResult.rows.length) {
    return res.status(404).send(`<h1>Changelog not found</h1>`);
  }
  const project = projResult.rows[0];

  const entriesResult = await db.execute({
    sql: "SELECT * FROM entries WHERE project_id = ? AND published = 1 ORDER BY published_at DESC",
    args: [project.id],
  });
  const entries = entriesResult.rows;

  const entriesHtml = entries.length === 0
    ? `<div class="empty">No entries published yet.</div>`
    : entries.map(e => `
      <article class="entry">
        <div class="entry-meta">
          <span class="entry-version">v${e.version}</span>
          <span class="entry-type" style="background:${typeColor(e.type)}20;color:${typeColor(e.type)}">${typeLabel(e.type)}</span>
          <span class="entry-date">${fmtDate(e.published_at || e.created_at)}</span>
        </div>
        <h2 class="entry-title">${e.title}</h2>
        <div class="entry-body">${renderMarkdown(e.body)}</div>
      </article>
    `).join('<div class="entry-divider"></div>');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${project.name} — Changelog</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --purple:#7c3aed;--purple-lt:#f5f3ff;--purple-md:#ede9fe;--purple-dk:#5b21b6;
      --ink:#18161a;--ink2:#3f3a44;--muted:#7c7585;--faint:#c4bfca;
      --border:#e8e3f0;--bg:#fdfcff;--white:#ffffff;
      --font:'Geist',sans-serif;--display:'Instrument Serif',serif;--mono:'Geist Mono',monospace;
    }
    html{scroll-behavior:smooth}
    body{font-family:var(--font);background:var(--bg);color:var(--ink);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
    .page{max-width:680px;margin:0 auto;padding:0 24px}

    header{padding:64px 0 48px;border-bottom:1px solid var(--border)}
    .header-tag{display:inline-flex;align-items:center;gap:6px;background:var(--purple-md);color:var(--purple-dk);font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:20px}
    .header-tag-dot{width:5px;height:5px;background:var(--purple);border-radius:50%}
    header h1{font-family:var(--display);font-size:clamp(36px,5vw,52px);font-weight:400;font-style:italic;color:var(--ink);line-height:1.1;letter-spacing:-0.01em;margin-bottom:10px}
    header p{font-size:15px;color:var(--muted);font-weight:300;line-height:1.65}
    .header-meta{display:flex;align-items:center;gap:16px;margin-top:20px;font-size:12px;color:var(--faint)}
    .header-meta span{display:flex;align-items:center;gap:5px}

    .entries{padding:48px 0}
    .entry{padding:40px 0}
    .entry-meta{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
    .entry-version{font-family:var(--mono);font-size:13px;font-weight:500;color:var(--purple-dk);background:var(--purple-lt);border:1px solid var(--purple-md);border-radius:6px;padding:3px 10px}
    .entry-type{font-size:10px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;border-radius:20px;padding:3px 10px}
    .entry-date{font-size:12px;color:var(--faint);margin-left:auto}
    .entry-title{font-family:var(--display);font-size:clamp(22px,3vw,30px);font-weight:400;color:var(--ink);line-height:1.2;margin-bottom:16px;letter-spacing:-0.01em}
    .entry-body{font-size:15px;color:var(--ink2);line-height:1.75}
    .entry-body h1,.entry-body h2,.entry-body h3{font-family:var(--display);color:var(--ink);margin:20px 0 8px;font-weight:400}
    .entry-body h2{font-size:20px}.entry-body h3{font-size:17px}
    .entry-body p{margin-bottom:12px}
    .entry-body ul{padding-left:20px;margin-bottom:12px}
    .entry-body li{margin-bottom:4px}
    .entry-body code{font-family:var(--mono);font-size:13px;background:var(--purple-lt);color:var(--purple-dk);border-radius:4px;padding:2px 6px}
    .entry-body pre{background:var(--ink);border-radius:10px;padding:16px 20px;overflow-x:auto;margin:16px 0}
    .entry-body pre code{background:transparent;color:#e2d9f3;font-size:13px;padding:0}
    .entry-body a{color:var(--purple);text-decoration:underline;text-decoration-color:var(--purple-md)}
    .entry-body strong{font-weight:500;color:var(--ink)}
    .entry-divider{height:1px;background:var(--border);margin:0}
    .empty{text-align:center;padding:80px 0;color:var(--faint);font-size:14px}

    footer{border-top:1px solid var(--border);padding:32px 0;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--faint)}
    .footer-brand{display:flex;align-items:center;gap:6px;color:var(--purple);font-weight:500;text-decoration:none}
    .footer-dot{width:6px;height:6px;background:var(--purple);border-radius:50%}
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div class="header-tag"><span class="header-tag-dot"></span>Changelog</div>
      <h1>${project.name}</h1>
      ${project.description ? `<p>${project.description}</p>` : ''}
      <div class="header-meta">
        <span>${entries.length} release${entries.length !== 1 ? 's' : ''}</span>
      </div>
    </header>
    <div class="entries">${entriesHtml}</div>
    <footer>
      <span>${project.name} Changelog</span>
      <a class="footer-brand" href="/"><span class="footer-dot"></span>Built with Changelog Builder</a>
    </footer>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}
