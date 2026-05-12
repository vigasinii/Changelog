// ── State ──────────────────────────────────────────────
let projects       = [];
let currentProject = null;
let currentEntries = [];

function showView(id) {
  ['view-home','view-project','view-editor'].forEach(v =>
    document.getElementById(v).classList.toggle('hidden', v !== id)
  );
}

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  bindGlobalEvents();
});

// ── Projects ──────────────────────────────────────────────
async function loadProjects() {
  try {
    const res  = await fetch('/api/projects');
    const data = await res.json();
    projects   = data.projects || [];
    renderProjectGrid();
    renderSidebar();
  } catch {
    document.getElementById('project-grid').innerHTML = '<div class="state-msg">Failed to load projects.</div>';
  }
}

function renderSidebar() {
  const el = document.getElementById('sb-projects');
  if (!projects.length) { el.innerHTML = '<div class="sb-loading">No projects yet</div>'; return; }
  el.innerHTML = projects.map(p => `
    <button class="sb-project-item ${currentProject?.id == p.id ? 'active' : ''}" onclick="openProject(${p.id})">
      <span class="sb-project-dot"></span>
      <span class="sb-project-name">${esc(p.name)}</span>
      <span class="sb-project-count">${p.published_count || 0}</span>
    </button>
  `).join('');
}

function renderProjectGrid() {
  const grid = document.getElementById('project-grid');
  const cards = projects.map(p => `
    <div class="project-card" onclick="openProject(${p.id})">
      <div class="project-card-name">${esc(p.name)}</div>
      ${p.description ? `<div class="project-card-desc">${esc(p.description)}</div>` : ''}
      <div class="project-card-meta">
        <div class="project-card-counts">
          <span class="pcount"><strong>${p.entry_count || 0}</strong> entries</span>
          <span class="pcount"><strong>${p.published_count || 0}</strong> published</span>
        </div>
        <span class="project-card-slug">/p/${esc(p.slug)}</span>
      </div>
    </div>
  `).join('');

  const addCard = `
    <div class="project-card project-card-empty" onclick="document.getElementById('new-project-btn').click()">
      <div class="project-card-empty-inner">
        <div class="project-card-empty-icon">${projects.length ? '+' : '📝'}</div>
        <div class="project-card-empty-label">${projects.length ? 'New project' : 'Create your first project'}</div>
      </div>
    </div>`;

  grid.innerHTML = cards + addCard;
}

// ── Open Project ──────────────────────────────────────────
async function openProject(id) {
  currentProject = projects.find(p => p.id == id);
  if (!currentProject) return;
  showView('view-project');
  document.getElementById('project-name-title').textContent = currentProject.name;
  document.getElementById('share-link').href = `/p/${currentProject.slug}`;
  renderSidebar();
  await loadEntries(id);
}
window.openProject = openProject;

async function loadEntries(projectId) {
  const el = document.getElementById('entries-list');
  el.innerHTML = '<div class="state-msg">Loading entries…</div>';
  try {
    const res  = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    currentEntries = data.entries || [];
    renderEntries();
  } catch {
    el.innerHTML = '<div class="state-msg">Failed to load entries.</div>';
  }
}

function renderEntries() {
  const el = document.getElementById('entries-list');
  if (!currentEntries.length) {
    el.innerHTML = `<div class="state-msg">No entries yet — <button style="background:none;border:none;color:var(--purple);cursor:pointer;font-size:14px;font-family:var(--font)" onclick="openEditor()">create the first one →</button></div>`;
    return;
  }
  el.innerHTML = currentEntries.map(e => `
    <div class="entry-item ${e.published ? 'published' : 'draft'}">
      <div class="entry-item-left">
        <div class="entry-item-meta">
          <span class="entry-version">v${esc(e.version)}</span>
          <span class="entry-type-badge ${e.type}">${e.type}</span>
          <span class="entry-status ${e.published ? 'published' : 'draft'}">${e.published ? 'Published' : 'Draft'}</span>
          <span class="entry-date">${fmtDate(e.created_at)}</span>
        </div>
        <div class="entry-title">${esc(e.title)}</div>
        <div class="entry-preview">${esc((e.body || '').substring(0, 100))}…</div>
      </div>
      <div class="entry-item-actions">
        <button class="entry-publish-btn ${e.published ? 'unpublish' : 'publish'}" onclick="togglePublish(${e.id}, ${e.published ? 1 : 0})">
          ${e.published ? 'Unpublish' : 'Publish'}
        </button>
        <button class="entry-action-btn" title="Edit" onclick="openEditor(${e.id})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="entry-action-btn del" title="Delete" onclick="deleteEntry(${e.id})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ── Publish / Delete ──────────────────────────────────────
async function togglePublish(id, isPublished) {
  await fetch(`/api/entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ published: !isPublished }),
  });
  showToast(isPublished ? 'Unpublished' : 'Published!', 'success');
  await loadEntries(currentProject.id);
  await loadProjects();
}
window.togglePublish = togglePublish;

async function deleteEntry(id) {
  if (!confirm('Delete this entry?')) return;
  await fetch(`/api/entries/${id}`, { method: 'DELETE' });
  showToast('Deleted', 'success');
  await loadEntries(currentProject.id);
  await loadProjects();
}
window.deleteEntry = deleteEntry;

// ── Editor ────────────────────────────────────────────────
function openEditor(entryId) {
  const entry = entryId ? currentEntries.find(e => e.id == entryId) : null;
  document.getElementById('editor-title').textContent      = entry ? 'Edit Entry' : 'New Entry';
  document.getElementById('editor-back-label').textContent = currentProject?.name || 'Back';
  document.getElementById('e-version').value = entry?.version || '';
  document.getElementById('e-type').value    = entry?.type    || 'minor';
  document.getElementById('e-title').value   = entry?.title   || '';
  document.getElementById('e-body').value    = entry?.body    || '';
  document.getElementById('e-id').value      = entry?.id      || '';
  updatePreview();
  showView('view-editor');
}
window.openEditor = openEditor;

// ── Live Preview ──────────────────────────────────────────
function updatePreview() {
  const version = document.getElementById('e-version').value;
  const type    = document.getElementById('e-type').value;
  const title   = document.getElementById('e-title').value;
  const body    = document.getElementById('e-body').value;
  const el      = document.getElementById('preview-body');

  if (!title && !body) {
    el.innerHTML = '<p class="preview-empty">Start typing to see a preview…</p>';
    return;
  }

  el.innerHTML = `
    <div class="preview-entry-meta">
      ${version ? `<span class="preview-version">v${esc(version)}</span>` : ''}
      ${type    ? `<span class="preview-type">${esc(type)}</span>` : ''}
    </div>
    ${title ? `<div class="preview-title">${esc(title)}</div>` : ''}
    <div class="preview-content">${renderMd(body)}</div>
  `;
}

// ── Markdown Renderer (line-by-line, no broken regex) ─────
function renderMd(raw) {
  if (!raw) return '';
  const lines  = raw.split('\n');
  const out    = [];
  let inPre    = false;
  let preLines = [];
  let inUl     = false;

  const closeUl = () => { if (inUl) { out.push('</ul>'); inUl = false; } };

  for (const line of lines) {
    if (line.startsWith('```')) {
      closeUl();
      if (!inPre) { inPre = true; preLines = []; }
      else { out.push(`<pre><code>${esc(preLines.join('\n'))}</code></pre>`); inPre = false; }
      continue;
    }
    if (inPre) { preLines.push(line); continue; }

    if (line.startsWith('### ')) { closeUl(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## '))  { closeUl(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# '))   { closeUl(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }

    if (line.match(/^[-*] /)) {
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    closeUl();

    if (line.trim() === '') { out.push('<div style="height:8px"></div>'); continue; }

    out.push(`<p>${inline(line)}</p>`);
  }
  closeUl();
  return out.join('');
}

function inline(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g,     '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
}

// ── Save ──────────────────────────────────────────────────
async function saveEntry(publish) {
  const version = document.getElementById('e-version').value.trim();
  const type    = document.getElementById('e-type').value;
  const title   = document.getElementById('e-title').value.trim();
  const body    = document.getElementById('e-body').value.trim();
  const id      = document.getElementById('e-id').value;

  if (!version || !title || !body) {
    showToast('Version, title, and body are required', 'error');
    return;
  }

  try {
    if (id) {
      await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, type, title, body, published: publish }),
      });
    } else {
      const res  = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: currentProject.id, version, type, title, body }),
      });
      const data = await res.json();
      if (publish) {
        await fetch(`/api/entries/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published: true }),
        });
      }
    }
    showToast(publish ? 'Published!' : 'Draft saved', 'success');
    await loadEntries(currentProject.id);
    await loadProjects();
    showView('view-project');
  } catch { showToast('Failed to save', 'error'); }
}

// ── Bind Events ───────────────────────────────────────────
function bindGlobalEvents() {
  document.getElementById('back-btn').onclick        = () => { showView('view-home'); currentProject = null; renderSidebar(); };
  document.getElementById('editor-back-btn').onclick = () => showView('view-project');
  document.getElementById('new-entry-btn').onclick   = () => openEditor();
  document.getElementById('editor-save-draft').onclick = () => saveEntry(false);
  document.getElementById('editor-publish').onclick    = () => saveEntry(true);

  ['e-version','e-title','e-body'].forEach(id =>
    document.getElementById(id).addEventListener('input', updatePreview)
  );
  document.getElementById('e-type').addEventListener('change', updatePreview);

  const modal = document.getElementById('project-modal');
  document.getElementById('new-project-btn').onclick      = () => modal.classList.remove('hidden');
  document.getElementById('project-modal-close').onclick  = () => modal.classList.add('hidden');
  document.getElementById('project-modal-cancel').onclick = () => modal.classList.add('hidden');
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  document.getElementById('project-modal-save').onclick = async () => {
    const name = document.getElementById('p-name').value.trim();
    const desc = document.getElementById('p-desc').value.trim();
    if (!name) { showToast('Name required', 'error'); return; }
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc }),
      });
      document.getElementById('p-name').value = '';
      document.getElementById('p-desc').value = '';
      modal.classList.add('hidden');
      showToast('Project created!', 'success');
      await loadProjects();
    } catch { showToast('Failed to create', 'error'); }
  };

  document.getElementById('p-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('project-modal-save').click();
  });
}

// ── Utils ─────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

let toastTimer;
function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  const t       = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type}`;
  toastTimer    = setTimeout(() => t.classList.add('hidden'), 3200);
}
