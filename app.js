// ===== DATA LAYER =====
// Base problems loaded from problems.json (visible to all visitors)
// localStorage additions/edits/deletions are layered on top
const DB_KEY = 'codevault_problems';
const DELETED_KEY = 'codevault_deleted';
let baseProblems = []; // Loaded from problems.json

// Load base problems from the static JSON file
async function loadBaseProblems() {
  try {
    const resp = await fetch('problems.json?t=' + new Date().getTime(), { cache: 'no-store' });
    if (resp.ok) {
      baseProblems = await resp.json();
    }
  } catch (e) {
    console.log('No problems.json found, using localStorage only');
  }
  // Initialize the app after loading base data
  refreshDashboard();
}

// Get all problems: base (from JSON) + local additions/edits - local deletions
function getProblems() {
  const localProblems = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
  const deletedIds = new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'));
  
  const localMap = new Map();
  localProblems.forEach(p => localMap.set(p.id, p));

  const allProblems = [];

  // 1. Add base problems (if not deleted, applying local edits if any)
  baseProblems.forEach(p => {
    if (!deletedIds.has(p.id)) {
      if (localMap.has(p.id)) {
        allProblems.push(localMap.get(p.id)); // Use the edited local version
        localMap.delete(p.id);
      } else {
        allProblems.push(p);
      }
    }
  });

  // 2. Add remaining local problems (newly added problems)
  localMap.forEach(p => {
    if (!deletedIds.has(p.id)) {
      allProblems.push(p);
    }
  });

  // Sort by date descending
  allProblems.sort((a, b) => new Date(b.date) - new Date(a.date));
  return allProblems;
}

// Save only local additions/edits/deletions to localStorage
function saveProblems(problems) {
  const baseMap = new Map(baseProblems.map(p => [p.id, p]));
  const localToSave = [];
  const currentIds = new Set();
  
  // Find additions and edits
  problems.forEach(p => {
      currentIds.add(p.id);
      const baseVersion = baseMap.get(p.id);
      if (!baseVersion || JSON.stringify(p) !== JSON.stringify(baseVersion)) {
          localToSave.push(p);
      }
  });
  
  // Find deletions from base
  const deletedIds = [];
  baseProblems.forEach(p => {
      if (!currentIds.has(p.id)) {
          deletedIds.push(p.id);
      }
  });
  
  localStorage.setItem(DB_KEY, JSON.stringify(localToSave));
  localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));
}

// Export all problems as JSON (for updating problems.json)
function exportProblems() {
  const allProblems = getProblems();
  const json = JSON.stringify(allProblems, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'problems.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Problems exported! Replace problems.json in your repo and push.', 'success');
}

// ===== ACTION ANIME BACKGROUND (Energy + Lightning + Embers) =====
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let embers = [], sparks = [], bolts = [];
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Rising Fire Embers
class Ember {
  constructor() { this.reset(true); }
  reset(init) {
    this.x = Math.random() * canvas.width;
    this.y = init ? Math.random() * canvas.height : canvas.height + 10;
    this.size = Math.random() * 2.5 + 0.5;
    this.speedY = -(Math.random() * 0.8 + 0.2);
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.7 + 0.3;
    this.life = 1;
    this.decay = Math.random() * 0.003 + 0.001;
    const r = Math.random();
    this.color = r < 0.5 ? [0,200,255] : r < 0.8 ? [255,106,0] : [255,215,0];
  }
  update() {
    this.y += this.speedY; this.x += this.speedX + Math.sin(this.y * 0.01) * 0.2;
    this.life -= this.decay;
    if (this.life <= 0 || this.y < -10) this.reset(false);
  }
  draw() {
    const a = this.opacity * this.life;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color[0]},${this.color[1]},${this.color[2]},${a})`; ctx.fill();
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color[0]},${this.color[1]},${this.color[2]},${a * 0.1})`; ctx.fill();
  }
}

// Energy Sparks (fast horizontal streaks)
class Spark {
  constructor() { this.reset(); }
  reset() {
    this.x = -50; this.y = Math.random() * canvas.height;
    this.speed = Math.random() * 4 + 2;
    this.length = Math.random() * 40 + 20;
    this.opacity = Math.random() * 0.4 + 0.1;
    this.active = Math.random() < 0.02;
  }
  update() {
    if (!this.active) { this.active = Math.random() < 0.002; return; }
    this.x += this.speed;
    if (this.x > canvas.width + 50) this.reset();
  }
  draw() {
    if (!this.active) return;
    const grad = ctx.createLinearGradient(this.x - this.length, this.y, this.x, this.y);
    grad.addColorStop(0, `rgba(0,200,255,0)`);
    grad.addColorStop(1, `rgba(0,200,255,${this.opacity})`);
    ctx.beginPath(); ctx.moveTo(this.x - this.length, this.y); ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

// Lightning Bolts (rare flashes)
let lightningTimer = 0;
let lightningFlash = 0;
function drawLightning() {
  lightningTimer++;
  if (lightningFlash > 0) {
    ctx.fillStyle = `rgba(0,200,255,${lightningFlash * 0.02})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    lightningFlash -= 0.5;
  }
  if (lightningTimer > 400 + Math.random() * 600) {
    lightningTimer = 0; lightningFlash = 3;
    const x = Math.random() * canvas.width;
    let y = 0; ctx.strokeStyle = 'rgba(0,200,255,0.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 0; i < 8; i++) {
      y += canvas.height / 10;
      ctx.lineTo(x + (Math.random() - 0.5) * 80, y);
    }
    ctx.stroke();
  }
}

for (let i = 0; i < 60; i++) embers.push(new Ember());
for (let i = 0; i < 15; i++) sparks.push(new Spark());

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLightning();
  embers.forEach(e => { e.update(); e.draw(); });
  sparks.forEach(s => { s.update(); s.draw(); });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ===== NAVIGATION =====
function switchSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById(name);
  if (sec) sec.classList.add('active');
  const link = document.querySelector(`.nav-link[data-section="${name}"]`);
  if (link) link.classList.add('active');
  if (name === 'dashboard') refreshDashboard();
  if (name === 'problems') renderProblems();
  if (name === 'stats') renderAnalytics();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => { e.preventDefault(); switchSection(link.dataset.section); });
});

// ===== GREETING =====
function setGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  document.getElementById('greeting').textContent = g;
}
setGreeting();

// ===== TOAST =====
function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`; t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ===== SEARCH =====
const searchOverlay = document.getElementById('searchOverlay');
document.getElementById('searchToggle').addEventListener('click', () => {
  searchOverlay.classList.add('open');
  document.getElementById('searchInput').focus();
});
searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) searchOverlay.classList.remove('open'); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') searchOverlay.classList.remove('open');
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchOverlay.classList.add('open'); document.getElementById('searchInput').focus(); }
});
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const results = document.getElementById('searchResults');
  if (!q) { results.innerHTML = ''; return; }
  const problems = getProblems().filter(p =>
    p.title.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q)
  );
  results.innerHTML = problems.length ? problems.slice(0, 8).map(p => `
    <div class="search-result-item" onclick="openProblem('${p.id}'); searchOverlay.classList.remove('open');">
      <div class="recent-diff" style="background:${diffColor(p.difficulty)}"></div>
      <div class="recent-info"><div class="recent-title">${p.title}</div><div class="recent-meta">${p.platform} • ${p.topic}</div></div>
    </div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--text2)">No results found</div>';
});

function diffColor(d) { return d === 'Easy' ? '#00ff88' : d === 'Medium' ? '#ffaa00' : '#ff2a2a'; }

// ===== FORM HANDLING =====
document.getElementById('problemForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const problem = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    title: document.getElementById('formTitle').value.trim(),
    platform: document.getElementById('formPlatform').value,
    difficulty: document.querySelector('input[name="difficulty"]:checked')?.value || 'Easy',
    topic: document.getElementById('formTopic').value.trim(),
    url: document.getElementById('formUrl').value.trim(),
    question: document.getElementById('formQuestion').value.trim(),
    approach: document.getElementById('formApproach').value.trim(),
    language: document.getElementById('formLanguage').value,
    solution: document.getElementById('formSolution').value.trim(),
    timeComplexity: document.getElementById('formTimeComplexity').value.trim(),
    spaceComplexity: document.getElementById('formSpaceComplexity').value.trim(),
    notes: document.getElementById('formNotes').value.trim(),
    date: new Date().toISOString(),
  };
  const problems = getProblems();
  problems.unshift(problem);
  saveProblems(problems);
  showToast('Problem saved successfully! 🎉');
  resetForm();
  switchSection('problems');
});

function resetForm() {
  document.getElementById('problemForm').reset();
}

// ===== RENDER PROBLEMS =====
function renderProblems() {
  let problems = getProblems();
  const pf = document.getElementById('filterPlatform').value;
  const df = document.getElementById('filterDifficulty').value;
  const tf = document.getElementById('filterTopic').value;
  const sf = document.getElementById('filterSort').value;
  if (pf !== 'all') problems = problems.filter(p => p.platform === pf);
  if (df !== 'all') problems = problems.filter(p => p.difficulty === df);
  if (tf !== 'all') problems = problems.filter(p => p.topic.toLowerCase().includes(tf.toLowerCase()));
  if (sf === 'oldest') problems.reverse();
  else if (sf === 'name') problems.sort((a, b) => a.title.localeCompare(b.title));
  else if (sf === 'difficulty') { const o = { Easy: 1, Medium: 2, Hard: 3 }; problems.sort((a, b) => o[a.difficulty] - o[b.difficulty]); }

  const grid = document.getElementById('problemsGrid');
  const empty = document.getElementById('emptyProblems');
  if (!problems.length) { grid.innerHTML = ''; grid.appendChild(empty); empty.style.display = 'block'; return; }

  grid.innerHTML = problems.map(p => `
    <div class="problem-card" onclick="openProblem('${p.id}')">
      <div class="card-top">
        <div><h3>${escHtml(p.title)}</h3><span class="meta-tag">${p.platform}</span></div>
        <span class="badge badge-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
      </div>
      <p style="font-size:0.82rem;color:var(--text2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escHtml(p.question)}</p>
      <div class="card-meta">
        <span class="meta-tag">📂 ${escHtml(p.topic)}</span>
        ${p.timeComplexity ? `<span class="meta-tag">⏱ ${escHtml(p.timeComplexity)}</span>` : ''}
        <span class="meta-tag">📅 ${new Date(p.date).toLocaleDateString()}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();editProblem('${p.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteProblem('${p.id}')">Delete</button>
      </div>
    </div>`).join('');

  // Populate topic filter
  const topics = [...new Set(getProblems().map(p => p.topic))];
  const topicSelect = document.getElementById('filterTopic');
  const current = topicSelect.value;
  topicSelect.innerHTML = '<option value="all">All Topics</option>' + topics.map(t => `<option value="${t}" ${t === current ? 'selected' : ''}>${t}</option>`).join('');
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// Filter listeners
['filterPlatform', 'filterDifficulty', 'filterTopic', 'filterSort'].forEach(id => {
  document.getElementById(id).addEventListener('change', renderProblems);
});

// View toggle
document.getElementById('viewGrid').addEventListener('click', () => {
  document.getElementById('problemsGrid').classList.remove('list-view');
  document.getElementById('viewGrid').classList.add('active');
  document.getElementById('viewList').classList.remove('active');
});
document.getElementById('viewList').addEventListener('click', () => {
  document.getElementById('problemsGrid').classList.add('list-view');
  document.getElementById('viewList').classList.add('active');
  document.getElementById('viewGrid').classList.remove('active');
});

// ===== PROBLEM MODAL =====
function openProblem(id) {
  const p = getProblems().find(x => x.id === id);
  if (!p) return;
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <h2 class="modal-title">${escHtml(p.title)}</h2>
    <div class="modal-badges">
      <span class="badge badge-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
      <span class="badge badge-platform">${p.platform}</span>
      <span class="meta-tag">📂 ${escHtml(p.topic)}</span>
      <span class="meta-tag">📅 ${new Date(p.date).toLocaleDateString()}</span>
      ${p.url ? `<a href="${escHtml(p.url)}" target="_blank" class="link-btn" style="margin-left:auto">Open Problem ↗</a>` : ''}
    </div>
    <div class="modal-section"><h4>📋 Problem Statement</h4><p>${escHtml(p.question)}</p></div>
    <div class="modal-section"><h4>💡 Approach</h4><p>${escHtml(p.approach)}</p></div>
    <div class="modal-section"><h4>💻 Solution</h4><pre><code class="language-${p.language || 'plaintext'}">${escHtml(p.solution)}</code></pre></div>
    ${p.timeComplexity || p.spaceComplexity ? `<div class="modal-section"><h4>⚡ Complexity</h4><div class="modal-complexity">
      ${p.timeComplexity ? `<span class="complexity-tag"><strong>Time:</strong> ${escHtml(p.timeComplexity)}</span>` : ''}
      ${p.spaceComplexity ? `<span class="complexity-tag"><strong>Space:</strong> ${escHtml(p.spaceComplexity)}</span>` : ''}
    </div></div>` : ''}
    ${p.notes ? `<div class="modal-section"><h4>📝 Notes</h4><p>${escHtml(p.notes)}</p></div>` : ''}`;
  document.getElementById('problemModal').classList.add('open');
  
  // Highlight the code block in the modal
  const codeBlock = body.querySelector('pre code');
  if (codeBlock && typeof hljs !== 'undefined') {
      hljs.highlightElement(codeBlock);
  }
}
document.getElementById('modalClose').addEventListener('click', () => document.getElementById('problemModal').classList.remove('open'));
document.getElementById('problemModal').addEventListener('click', (e) => { if (e.target.id === 'problemModal') document.getElementById('problemModal').classList.remove('open'); });

function deleteProblem(id) {
  if (!confirm('Delete this problem?')) return;
  saveProblems(getProblems().filter(p => p.id !== id));
  showToast('Problem deleted', 'error');
  renderProblems();
}

function editProblem(id) {
  const p = getProblems().find(x => x.id === id);
  if (!p) return;
  switchSection('add');
  document.getElementById('formTitle').value = p.title;
  document.getElementById('formPlatform').value = p.platform;
  const diffRadio = document.querySelector(`input[name="difficulty"][value="${p.difficulty}"]`);
  if (diffRadio) diffRadio.checked = true;
  document.getElementById('formTopic').value = p.topic;
  document.getElementById('formUrl').value = p.url || '';
  document.getElementById('formQuestion').value = p.question;
  document.getElementById('formApproach').value = p.approach;
  document.getElementById('formLanguage').value = p.language || 'python';
  document.getElementById('formSolution').value = p.solution;
  document.getElementById('formTimeComplexity').value = p.timeComplexity || '';
  document.getElementById('formSpaceComplexity').value = p.spaceComplexity || '';
  document.getElementById('formNotes').value = p.notes || '';
  // Trigger VS Code Editor Update
  if (typeof updateEditor === 'function') {
      // Also update the language selection visual since value was just changed programmatically
      const e = new Event('change');
      document.getElementById('formLanguage').dispatchEvent(e);
      updateEditor();
  }
  // Remove old entry on save
  saveProblems(getProblems().filter(x => x.id !== id));
}

// ===== DASHBOARD =====
function refreshDashboard() {
  const problems = getProblems();
  const easy = problems.filter(p => p.difficulty === 'Easy').length;
  const med = problems.filter(p => p.difficulty === 'Medium').length;
  const hard = problems.filter(p => p.difficulty === 'Hard').length;

  animateCounter('totalSolved', problems.length);
  animateCounter('easySolved', easy);
  animateCounter('mediumSolved', med);
  animateCounter('hardSolved', hard);

  drawRing('easyRing', easy, problems.length, '#00ff88');
  drawRing('mediumRing', med, problems.length, '#ffaa00');
  drawRing('hardRing', hard, problems.length, '#ff2a2a');

  // Streak
  const streak = calcStreak(problems);
  document.getElementById('streakCount').textContent = streak;

  // Recent
  const recent = document.getElementById('recentList');
  if (problems.length) {
    recent.innerHTML = problems.slice(0, 6).map(p => `
      <div class="recent-item" onclick="openProblem('${p.id}')">
        <div class="recent-diff" style="background:${diffColor(p.difficulty)}"></div>
        <div class="recent-info"><div class="recent-title">${escHtml(p.title)}</div>
        <div class="recent-meta">${p.platform} • ${new Date(p.date).toLocaleDateString()}</div></div>
      </div>`).join('');
  }

  // Platform chart
  const platCounts = {};
  problems.forEach(p => { platCounts[p.platform] = (platCounts[p.platform] || 0) + 1; });
  const platDiv = document.getElementById('platformChart');
  const colors = ['#00c8ff', '#ff6a00', '#ffd700', '#00ff88', '#7b2fff', '#ff2a2a'];
  if (Object.keys(platCounts).length) {
    platDiv.innerHTML = Object.entries(platCounts).sort((a, b) => b[1] - a[1]).map(([name, count], i) => `
      <div class="platform-bar-wrap">
        <div class="platform-bar-label"><span>${name}</span><span>${count}</span></div>
        <div class="platform-bar"><div class="platform-bar-fill" style="width:${(count / problems.length * 100)}%;background:${colors[i % colors.length]}"></div></div>
      </div>`).join('');
  }

  renderHeatmap(problems);
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  let current = 0;
  const step = Math.max(1, Math.floor(target / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(interval); }
    el.textContent = current;
  }, 30);
}

function drawRing(canvasId, value, total, color) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const cx = c.getContext('2d');
  const pct = total ? value / total : 0;
  cx.clearRect(0, 0, 50, 50);
  cx.beginPath(); cx.arc(25, 25, 20, 0, Math.PI * 2);
  cx.strokeStyle = 'rgba(255,255,255,0.06)'; cx.lineWidth = 4; cx.stroke();
  if (pct > 0) {
    cx.beginPath(); cx.arc(25, 25, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    cx.strokeStyle = color; cx.lineWidth = 4; cx.lineCap = 'round'; cx.stroke();
  }
}

function calcStreak(problems) {
  if (!problems.length) return 0;
  const dates = [...new Set(problems.map(p => new Date(p.date).toDateString()))].map(d => new Date(d)).sort((a, b) => b - a);
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let check = new Date(today);
  for (const d of dates) {
    const diff = Math.floor((check - d) / 86400000);
    if (diff <= 1) { streak++; check = d; } else break;
  }
  return streak;
}

// ===== HEATMAP =====
function renderHeatmap(problems) {
  const grid = document.getElementById('heatmapGrid');
  const months = document.getElementById('heatmapMonths');
  const now = new Date();
  const year = now.getFullYear();

  // Count problems per day
  const counts = {};
  problems.forEach(p => { const d = new Date(p.date).toISOString().split('T')[0]; counts[d] = (counts[d] || 0) + 1; });

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  let cells = '';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months.innerHTML = monthNames.map(m => `<span style="flex:1">${m}</span>`).join('');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    const count = counts[key] || 0;
    const level = count === 0 ? 0 : count <= 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
    cells += `<div class="heatmap-cell level-${level}" title="${key}: ${count} problems"></div>`;
  }
  grid.innerHTML = cells;
}

// ===== ANALYTICS =====
function renderAnalytics() {
  const problems = getProblems();
  drawDifficultyChart(problems);
  drawTopicBars(problems);
  drawMonthlyChart(problems);
  updatePerfStats(problems);
}

function fitCanvas(canvas) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = 260 * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = '260px';
  const cx = canvas.getContext('2d');
  cx.scale(dpr, dpr);
  return { w: rect.width, h: 260, cx };
}

function drawDifficultyChart(problems) {
  const c = document.getElementById('difficultyChart');
  const { w, h, cx } = fitCanvas(c);
  const easy = problems.filter(p => p.difficulty === 'Easy').length;
  const med = problems.filter(p => p.difficulty === 'Medium').length;
  const hard = problems.filter(p => p.difficulty === 'Hard').length;
  const total = easy + med + hard;
  if (!total) { cx.fillStyle = '#7a8ba8'; cx.font = '14px Outfit'; cx.textAlign = 'center'; cx.fillText('Solve problems to see chart', w / 2, h / 2); return; }

  const centerX = w / 2, centerY = h / 2 - 15, radius = Math.min(w, h) * 0.3;
  const data = [{ val: easy, color: '#00ff88', label: 'Easy' }, { val: med, color: '#ffaa00', label: 'Medium' }, { val: hard, color: '#ff2a2a', label: 'Hard' }];
  let startAngle = -Math.PI / 2;
  data.forEach(d => {
    if (d.val === 0) return;
    const slice = (d.val / total) * Math.PI * 2;
    cx.beginPath(); cx.arc(centerX, centerY, radius, startAngle, startAngle + slice);
    cx.arc(centerX, centerY, radius * 0.6, startAngle + slice, startAngle, true);
    cx.closePath(); cx.fillStyle = d.color; cx.fill();
    startAngle += slice;
  });
  cx.fillStyle = '#e8f0ff'; cx.font = 'bold 22px Outfit'; cx.textAlign = 'center';
  cx.fillText(total, centerX, centerY + 8);
  let ly = h - 25;
  data.forEach((d, i) => {
    const lx = w / 2 - 110 + i * 85;
    cx.fillStyle = d.color; cx.fillRect(lx, ly, 10, 10);
    cx.fillStyle = '#7a8ba8'; cx.font = '11px Outfit'; cx.textAlign = 'left';
    cx.fillText(`${d.label} (${d.val})`, lx + 14, ly + 9);
  });
}

function drawTopicBars(problems) {
  const container = document.getElementById('topicBars');
  const topicCounts = {};
  problems.forEach(p => { topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1; });
  const sorted = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) { container.innerHTML = '<div class="empty-state-mini"><p>Add problems to see topic mastery</p></div>'; return; }
  const max = sorted[0][1];
  container.innerHTML = sorted.map(([topic, count]) => `
    <div class="topic-bar-item">
      <div class="topic-bar-header"><span>${escHtml(topic)}</span><span>${count}</span></div>
      <div class="topic-bar-track"><div class="topic-bar-fill" style="width:${(count / max * 100)}%"></div></div>
    </div>`).join('');
}

function drawMonthlyChart(problems) {
  const c = document.getElementById('monthlyChart');
  const { w, h, cx } = fitCanvas(c);
  const months = Array(12).fill(0);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  problems.forEach(p => { const d = new Date(p.date); if (d.getFullYear() === new Date().getFullYear()) months[d.getMonth()]++; });
  const max = Math.max(...months, 1);
  const padding = 40;
  const barW = (w - padding * 2) / 12;
  const chartH = h - 45;

  cx.strokeStyle = 'rgba(0,200,255,0.06)'; cx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = 10 + (chartH / 4) * i;
    cx.beginPath(); cx.moveTo(padding, y); cx.lineTo(w - 10, y); cx.stroke();
  }

  months.forEach((val, i) => {
    const x = padding + i * barW;
    const bw = barW - 6;
    const barH = (val / max) * (chartH - 20);
    if (barH > 0) {
      const grad = cx.createLinearGradient(x, chartH + 10 - barH, x, chartH + 10);
      grad.addColorStop(0, '#00c8ff'); grad.addColorStop(1, '#ff6a00');
      cx.fillStyle = grad;
      cx.beginPath(); cx.roundRect(x, chartH + 10 - barH, bw, barH, [3, 3, 0, 0]); cx.fill();
      cx.fillStyle = '#e8f0ff'; cx.font = 'bold 10px Outfit'; cx.textAlign = 'center';
      cx.fillText(val, x + bw / 2, chartH + 4 - barH);
    }
    cx.fillStyle = '#7a8ba8'; cx.font = '10px Outfit'; cx.textAlign = 'center';
    cx.fillText(monthNames[i], x + bw / 2, h - 8);
  });
}

function updatePerfStats(problems) {
  if (!problems.length) return;
  const dates = {};
  problems.forEach(p => { const d = new Date(p.date).toDateString(); dates[d] = (dates[d] || 0) + 1; });
  const dayCount = Object.keys(dates).length;
  document.getElementById('avgPerDay').textContent = (problems.length / Math.max(dayCount, 1)).toFixed(1);
  document.getElementById('bestDay').textContent = Math.max(...Object.values(dates));
  document.getElementById('totalTopics').textContent = new Set(problems.map(p => p.topic)).size;
  document.getElementById('totalPlatforms').textContent = new Set(problems.map(p => p.platform)).size;
}

// ===== VS CODE EDITOR LOGIC =====
const vsEditor = document.getElementById('formSolution');
const vsHighlight = document.getElementById('codeHighlight');
const vsLineNumbers = document.getElementById('lineNumbers');
const vsLangSelect = document.getElementById('formLanguage');
const vsStatusLang = document.getElementById('vsStatusLang');
const vsStatusLines = document.getElementById('vsStatusLines');
const vsTabName = document.getElementById('vsTabName');

function updateEditor() {
    if (!vsEditor) return;
    const text = vsEditor.value;
    
    // Update line numbers
    const lines = text.split('\n').length;
    vsLineNumbers.innerHTML = Array(Math.max(1, lines)).fill(0).map((_, i) => `<span>${i + 1}</span>`).join('');
    
    // Update highlight
    const lang = vsLangSelect.value;
    const codeObj = vsHighlight.querySelector('code');
    codeObj.className = `language-${lang}`;
    
    if (text && typeof hljs !== 'undefined') {
        try {
            codeObj.innerHTML = hljs.highlight(text, { language: lang, ignoreIllegals: true }).value;
        } catch (e) {
            codeObj.textContent = text;
        }
    } else {
        codeObj.textContent = text;
    }
    
    // Update status bar
    const cursorLine = text.substr(0, vsEditor.selectionStart).split('\n').length;
    const cursorCol = vsEditor.selectionStart - text.lastIndexOf('\n', vsEditor.selectionStart - 1);
    vsStatusLines.textContent = `Ln ${cursorLine}, Col ${cursorCol}`;
}

if (vsEditor) {
    // Sync scroll
    vsEditor.addEventListener('scroll', () => {
        vsHighlight.scrollTop = vsEditor.scrollTop;
        vsHighlight.scrollLeft = vsEditor.scrollLeft;
        vsLineNumbers.scrollTop = vsEditor.scrollTop;
    });

    // Handle input and selection changes
    vsEditor.addEventListener('input', updateEditor);
    vsEditor.addEventListener('keyup', updateEditor);
    vsEditor.addEventListener('click', updateEditor);

    // Handle tab key
    vsEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = vsEditor.selectionStart;
            const end = vsEditor.selectionEnd;
            vsEditor.value = vsEditor.value.substring(0, start) + "    " + vsEditor.value.substring(end);
            vsEditor.selectionStart = vsEditor.selectionEnd = start + 4;
            updateEditor();
        }
        // Handle status update on arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            setTimeout(updateEditor, 10);
        }
    });

    // Handle language change
    vsLangSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        const extMap = {
            python: 'py', javascript: 'js', java: 'java', cpp: 'cpp', c: 'c',
            go: 'go', rust: 'rs', sql: 'sql', typescript: 'ts', csharp: 'cs', other: 'txt'
        };
        vsTabName.textContent = `solution.${extMap[lang] || 'txt'}`;
        
        const displayMap = {
            python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++', c: 'C',
            go: 'Go', rust: 'Rust', sql: 'SQL', typescript: 'TypeScript', csharp: 'C#', other: 'Other'
        };
        vsStatusLang.textContent = displayMap[lang] || 'Other';
        updateEditor();
    });
}

// ===== INIT =====
loadBaseProblems();

