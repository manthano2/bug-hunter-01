/* =========================================================
   BUG HUNTER — script.js
   Shared UI used on every page: sound, animated background,
   navbar, footer, toasts, modals, leaderboard, profile,
   ranks, badges, the landing page and the dashboard.

   NOTE: this file only DEFINES things. Each HTML page calls the
   init function it needs at the bottom of the page.
   ========================================================= */

/* ---------------- small helpers ---------------- */
function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function $(id){ return document.getElementById(id); }

/* The stored score can dip below 0 (hints cost points before XP is earned),
   but players always see it as 0 or more. */
function displayScore(progress){
  return Math.max(0, Number(progress.score) || 0);
}

/* ---------------- SOUND (Web Audio, no audio files needed) ---------------- */
let _audioCtx = null;

function getAudioCtx(){
  if(!_audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    _audioCtx = new AC();
  }
  if(_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function beep(freq, duration, type, volume, delay){
  try{
    const ctx = getAudioCtx();
    if(!ctx) return;
    const start = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.06, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }catch(e){ /* audio unavailable: fail silently */ }
}

function playSound(kind){
  if(!Store.getSoundOn()) return;
  switch(kind){
    case 'correct': beep(880, .12, 'sine', .06, 0); beep(1320, .18, 'sine', .06, .09); break;
    case 'wrong':   beep(170, .28, 'sawtooth', .05, 0); break;
    case 'click':   beep(620, .05, 'square', .025, 0); break;
    case 'hint':    beep(440, .09, 'triangle', .045, 0); break;
    case 'level':
      beep(660, .12, 'sine', .06, 0);
      beep(880, .12, 'sine', .06, .11);
      beep(1100, .12, 'sine', .06, .22);
      beep(1480, .30, 'sine', .06, .33);
      break;
  }
}

/* ---------------- ANIMATED BACKGROUND ---------------- */
function initBackground(){
  if($('matrixCanvas')) return;

  const field = document.createElement('div');
  field.className = 'particles';
  field.id = 'particleField';
  document.body.prepend(field);

  const canvas = document.createElement('canvas');
  canvas.id = 'matrixCanvas';
  document.body.prepend(canvas);

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;

  // floating particles
  for(let i = 0; i < 22; i++){
    const p = document.createElement('div');
    p.className = 'particle' + (Math.random() > 0.5 ? ' blue' : '');
    const size = 2 + Math.random() * 4;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = (Math.random() * 100) + '%';
    p.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
    p.style.animationDuration = (9 + Math.random() * 14) + 's';
    p.style.animationDelay = (-Math.random() * 20) + 's';
    field.appendChild(p);
  }

  // matrix rain
  const ctx = canvas.getContext('2d');
  const chars = '01<>{}[]/;=()BUGHUNTER'.split('');
  const size = 16;
  let w = 0, h = 0, drops = [];

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    drops = new Array(Math.ceil(w / size)).fill(0).map(() => Math.random() * -40);
  }
  resize();
  window.addEventListener('resize', resize);

  let last = 0;
  function draw(ts){
    requestAnimationFrame(draw);
    if(ts - last < 55) return;   // ~18 fps keeps it light on CPU
    last = ts;
    ctx.fillStyle = 'rgba(11,15,25,0.14)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = size + 'px "Fira Code", monospace';
    for(let i = 0; i < drops.length; i++){
      ctx.fillStyle = Math.random() > 0.15 ? '#00FF88' : '#00C2FF';
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * size, drops[i] * size);
      if(drops[i] * size > h && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  requestAnimationFrame(draw);
}

/* ---------------- TOASTS ---------------- */
function showToast(message, type){
  let wrap = $('toastWrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'toastWrap';
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'info');
  t.textContent = message;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('out'); }, 2600);
  setTimeout(() => { t.remove(); }, 3100);
}

/* ---------------- TYPING EFFECT ---------------- */
function typeText(el, text, speed, done){
  if(!el) return;
  el.textContent = '';
  el.classList.add('typed');
  let i = 0;
  const timer = setInterval(() => {
    el.textContent += text.charAt(i);
    i++;
    if(i >= text.length){
      clearInterval(timer);
      el.classList.remove('typed');
      if(done) done();
    }
  }, speed || 45);
}

/* ---------------- TERMINAL BOOT SCREEN ---------------- */
function runBootSequence(lines, onDone){
  const screen = $('bootScreen');
  const box = $('bootLines');
  if(!screen || !box){ if(onDone) onDone(); return; }

  let finished = false;
  function finish(){
    if(finished) return;
    finished = true;
    screen.classList.add('hidden');
    if(onDone) onDone();
  }
  screen.addEventListener('click', finish);   // click anywhere to skip

  let lineIndex = 0;
  function nextLine(){
    if(finished) return;
    if(lineIndex >= lines.length){ setTimeout(finish, 450); return; }
    const el = document.createElement('div');
    el.className = 'boot-line';
    box.appendChild(el);
    const text = lines[lineIndex];
    let c = 0;
    const timer = setInterval(() => {
      if(finished){ clearInterval(timer); return; }
      el.textContent = text.slice(0, ++c);
      if(c >= text.length){
        clearInterval(timer);
        lineIndex++;
        setTimeout(nextLine, 170);
      }
    }, 16);
  }
  nextLine();
}

/* ---------------- RANKS & BADGES ---------------- */
const RANKS = [
  { min: 0,    name: 'Script Kiddie', icon: '🐣' },
  { min: 300,  name: 'Rookie Hunter', icon: '🔍' },
  { min: 700,  name: 'Bug Tracker',   icon: '🛰️' },
  { min: 1200, name: 'Code Breaker',  icon: '⚡' },
  { min: 1700, name: 'Elite Hunter',  icon: '🛡️' },
  { min: 2000, name: 'Master Hunter', icon: '👑' }
];

function getRank(score){
  let idx = 0;
  RANKS.forEach((r, i) => { if(score >= r.min) idx = i; });
  return { current: RANKS[idx], next: RANKS[idx + 1] || null };
}

const BADGES = [
  { id: 'first_bug',     name: 'First Bug Fixed', icon: '🐛', desc: 'Fix your first bug',            test: p => p.completedLevels.length >= 1 },
  { id: 'bug_hunter',    name: 'Bug Hunter',      icon: '🎯', desc: 'Complete 5 levels',             test: p => p.completedLevels.length >= 5 },
  { id: 'debugger',      name: 'Debugger',        icon: '🧠', desc: 'Complete 10 levels',            test: p => p.completedLevels.length >= 10 },
  { id: 'clean_coder',   name: 'Clean Coder',     icon: '✨', desc: 'Solve 3 levels with no hints',  test: p => p.noHintLevels.length >= 3 },
  { id: 'master_hunter', name: 'Master Hunter',   icon: '👑', desc: 'Complete all 20 levels',        test: p => p.completedLevels.length >= TOTAL_LEVELS }
];

function getEarnedBadges(progress){
  return BADGES.filter(b => b.test(progress));
}

/* ---------------- NAVBAR / FOOTER ---------------- */
function buildNavbar(opts){
  const mount = $('navbarMount');
  if(!mount) return;
  const active = (opts && opts.active) || '';
  const user = Store.getSession();
  const cls = (name) => (active === name ? 'active' : '');
  const soundIcon = Store.getSoundOn() ? '🔊' : '🔇';

  if(user){
    mount.innerHTML = `
      <nav class="navbar">
        <div class="container nav-inner">
          <a href="dashboard.html" class="nav-logo">BUG<span>_</span>HUNTER</a>
          <button class="nav-toggle" id="navToggle" type="button" aria-label="Open menu">&#9776;</button>
          <ul class="nav-links" id="navLinks">
            <li><a href="dashboard.html" class="${cls('dashboard')}">Dashboard</a></li>
            <li><a href="dashboard.html#levels" class="${cls('levels')}">Levels</a></li>
            <li><button type="button" id="navLeaderboard">Leaderboard</button></li>
            <li><button type="button" id="navProfile">Profile</button></li>
            <li><button type="button" id="navSound" title="Toggle sound">${soundIcon}</button></li>
            <li><button type="button" id="navLogout" class="nav-danger">Logout</button></li>
          </ul>
          <div class="nav-user"><span class="avatar">${escapeHtml(user.slice(0, 2).toUpperCase())}</span><span>${escapeHtml(user)}</span></div>
        </div>
      </nav>`;
    $('navLeaderboard').addEventListener('click', () => { playSound('click'); openLeaderboard(); closeMobileNav(); });
    $('navProfile').addEventListener('click', () => { playSound('click'); openProfile(); closeMobileNav(); });
    $('navLogout').addEventListener('click', () => { playSound('click'); logout(); });
    $('navSound').addEventListener('click', () => {
      const on = !Store.getSoundOn();
      Store.setSoundOn(on);
      $('navSound').textContent = on ? '🔊' : '🔇';
      if(on) playSound('click');
    });
  }else{
    mount.innerHTML = `
      <nav class="navbar">
        <div class="container nav-inner">
          <a href="index.html" class="nav-logo">BUG<span>_</span>HUNTER</a>
          <button class="nav-toggle" id="navToggle" type="button" aria-label="Open menu">&#9776;</button>
          <ul class="nav-links" id="navLinks">
            <li><a href="index.html" class="${cls('home')}">Home</a></li>
            <li><a href="login.html" class="${cls('login')}">Login</a></li>
            <li><a href="register.html" class="nav-cta ${cls('register')}">Register</a></li>
          </ul>
        </div>
      </nav>`;
  }

  $('navToggle').addEventListener('click', () => {
    $('navLinks').classList.toggle('open');
  });
}

function closeMobileNav(){
  const links = $('navLinks');
  if(links) links.classList.remove('open');
}

function buildFooter(){
  const mount = $('footerMount');
  if(!mount) return;
  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <span class="footer-logo">BUG<span>_</span>HUNTER</span>
        <span>Train your debugging instincts &mdash; your progress is saved locally in this browser.</span>
        <span class="footer-note">&copy; ${new Date().getFullYear()} Bug Hunter</span>
      </div>
    </footer>`;
}

/* ---------------- GENERIC MODAL (leaderboard / profile) ---------------- */
function ensureUtilityModal(){
  if($('utilityModal')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'utilityModal';
  overlay.innerHTML = `
    <div class="glass modal-box modal-wide" role="dialog" aria-modal="true">
      <button class="modal-close" id="utilityModalClose" type="button" aria-label="Close">&times;</button>
      <h2 id="utilityModalTitle"></h2>
      <div id="utilityModalBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  $('utilityModalClose').addEventListener('click', closeUtilityModal);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeUtilityModal(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeUtilityModal(); });
}

function openUtilityModal(title, html){
  ensureUtilityModal();
  $('utilityModalTitle').textContent = title;
  $('utilityModalBody').innerHTML = html;
  $('utilityModal').classList.add('show');
}

function closeUtilityModal(){
  const m = $('utilityModal');
  if(m) m.classList.remove('show');
}

function openLeaderboard(){
  const me = Store.getSession();
  const board = Store.getLeaderboard();
  let html;
  if(board.length === 0){
    html = '<p class="text-muted center">No agents on record yet.</p>';
  }else{
    const medals = ['🥇', '🥈', '🥉'];
    html = '<div class="lb-list">' + board.map((row, i) => `
      <div class="lb-row ${row.username === me ? 'me' : ''}">
        <span class="lb-rank">${medals[i] || '#' + (i + 1)}</span>
        <span class="lb-name">${escapeHtml(row.username)}${row.username === me ? ' <em>(you)</em>' : ''}</span>
        <span class="lb-levels">${row.completed}/${TOTAL_LEVELS} lvls</span>
        <span class="lb-score">${row.score} XP</span>
      </div>`).join('') + '</div>' +
      '<p class="text-muted small center" style="margin-top:14px;">Leaderboard is stored locally, so it ranks the agents registered in this browser.</p>';
  }
  openUtilityModal('🏆 Leaderboard', html);
}

function openProfile(){
  const username = Store.getSession();
  if(!username) return;
  const user = Store.findUser(username);
  const p = Store.getProgress(username);
  const rank = getRank(displayScore(p)).current;
  const earned = getEarnedBadges(p);
  const joined = user && user.joined ? new Date(user.joined).toLocaleDateString() : '-';

  const html = `
    <div class="profile-head">
      <div class="avatar avatar-lg">${escapeHtml(username.slice(0, 2).toUpperCase())}</div>
      <h3>${escapeHtml(username)}</h3>
      <p class="text-muted small">${rank.icon} ${rank.name} &middot; joined ${escapeHtml(joined)}</p>
    </div>
    <div class="modal-stats">
      <div><div class="m-val">${displayScore(p)}</div><div class="m-lbl">Score</div></div>
      <div><div class="m-val">${p.completedLevels.length}/${TOTAL_LEVELS}</div><div class="m-lbl">Levels</div></div>
      <div><div class="m-val">${p.hintsUsed}</div><div class="m-lbl">Hints</div></div>
      <div><div class="m-val">${earned.length}/${BADGES.length}</div><div class="m-lbl">Badges</div></div>
    </div>
    <div class="profile-badges">
      ${BADGES.map(b => `<span class="mini-badge ${earned.includes(b) ? 'on' : ''}" title="${escapeHtml(b.desc)}">${b.icon} ${escapeHtml(b.name)}</span>`).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn btn-danger btn-sm" id="profileReset" type="button">Reset Progress</button>
    </div>`;
  openUtilityModal('👤 Profile', html);

  $('profileReset').addEventListener('click', () => {
    if(confirm('Reset all your levels, score and hints? Your best score stays on the leaderboard.')){
      Store.resetProgress(username);
      window.location.href = 'dashboard.html';
    }
  });
}

/* ---------------- LANDING PAGE ---------------- */
function initLanding(){
  initBackground();
  buildNavbar({ active: 'home' });
  buildFooter();

  const user = Store.getSession();
  const primary = $('ctaPrimary');
  const secondary = $('ctaSecondary');
  if(user){
    primary.textContent = 'Continue Hunting →';
    primary.href = 'dashboard.html';
    secondary.style.display = 'none';
  }

  // level roadmap
  const road = $('roadmap');
  if(road){
    road.innerHTML = LEVELS.map(l => `
      <div class="road-chip diff-${l.difficulty.toLowerCase()}">
        <span class="road-num">${String(l.id).padStart(2, '0')}</span>
        <span class="road-title">${escapeHtml(l.title)}</span>
        <span class="road-diff">${l.difficulty}</span>
      </div>`).join('');
  }

  // hero headline typing
  const typed = $('heroType');
  if(typed) typeText(typed, 'Bug Hunter', 70);

  // boot screen only once per browser session
  let booted = false;
  try{ booted = sessionStorage.getItem('bugHunterBooted') === '1'; }catch(e){ /* ignore */ }
  const screen = $('bootScreen');
  if(booted){
    if(screen) screen.classList.add('hidden');
  }else{
    try{ sessionStorage.setItem('bugHunterBooted', '1'); }catch(e){ /* ignore */ }
    runBootSequence([
      'BUG_HUNTER OS v2.6 booting...',
      'Loading security modules............ [ OK ]',
      'Mounting local storage.............. [ OK ]',
      'Compiling 20 broken programs........ [ OK ]',
      'System ready. Welcome, agent.'
    ]);
  }
}

/* ---------------- DASHBOARD ---------------- */
function initDashboard(){
  if(!requireAuth()) return;
  initBackground();
  buildNavbar({ active: 'dashboard' });
  buildFooter();

  const username = Store.getSession();
  const p = Store.getProgress(username);
  const done = p.completedLevels.length;
  const unlocked = Math.min(Math.max(p.currentLevel, 1), TOTAL_LEVELS);
  const pct = Math.round((done / TOTAL_LEVELS) * 100);

  typeText($('welcomeName'), username, 60);

  $('statProgress').textContent = pct + '%';
  $('statLevels').textContent = done + ' / ' + TOTAL_LEVELS;
  $('statHints').textContent = p.hintsUsed;
  const score = displayScore(p);
  $('statScore').textContent = score;

  // XP bar + rank
  const maxXp = TOTAL_LEVELS * XP_PER_LEVEL;
  const rank = getRank(score);
  $('rankName').textContent = rank.current.icon + ' ' + rank.current.name;
  $('xpText').textContent = score + ' / ' + maxXp + ' XP';
  $('rankNext').textContent = rank.next
    ? (rank.next.min - score) + ' XP to ' + rank.next.name
    : 'Max rank reached!';

  // animate bars after first paint
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $('progressFill').style.width = pct + '%';
    $('xpFill').style.width = Math.min(100, (score / maxXp) * 100) + '%';
  }));

  // continue button -> first unfinished unlocked level
  let nextId = 1;
  for(let i = 1; i <= unlocked; i++){
    if(!p.completedLevels.includes(i)){ nextId = i; break; }
    nextId = i;
  }
  const cont = $('continueBtn');
  if(done >= TOTAL_LEVELS){
    cont.textContent = '🏆 All levels complete — replay any level';
    cont.href = '#levels';
  }else{
    cont.textContent = (done === 0 ? 'Start Level 1 →' : 'Continue: Level ' + nextId + ' →');
    cont.href = 'game.html?level=' + nextId;
  }

  // level grid
  const grid = $('levelGrid');
  grid.innerHTML = LEVELS.map(l => {
    const isDone = p.completedLevels.includes(l.id);
    const locked = l.id > unlocked;
    const current = !isDone && !locked && l.id === nextId;
    const status = isDone ? '<span class="lv-status done">✔</span>'
                 : locked ? '<span class="lv-status">🔒</span>'
                 : current ? '<span class="lv-status now">▶</span>' : '';
    const inner = `
      ${status}
      <div class="lv-num">LEVEL ${String(l.id).padStart(2, '0')}</div>
      <h3>${escapeHtml(l.title)}</h3>
      <p>${escapeHtml(l.topic)}</p>
      <span class="diff diff-${l.difficulty.toLowerCase()}">${l.difficulty}</span>`;
    return locked
      ? `<div class="glass level-card locked" data-level="${l.id}" title="Complete level ${l.id - 1} to unlock">${inner}</div>`
      : `<a class="glass level-card ${isDone ? 'done' : ''} ${current ? 'current' : ''}" href="game.html?level=${l.id}" data-level="${l.id}">${inner}</a>`;
  }).join('');

  grid.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', () => {
      if(card.classList.contains('locked')){
        playSound('wrong');
        showToast('Locked! Complete level ' + (Number(card.dataset.level) - 1) + ' first.', 'error');
      }else{
        playSound('click');
      }
    });
  });

  // badges
  const earned = getEarnedBadges(p);
  $('badgeGrid').innerHTML = BADGES.map(b => `
    <div class="glass badge-card ${earned.includes(b) ? 'unlocked' : ''}">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${escapeHtml(b.name)}</div>
      <div class="badge-desc">${escapeHtml(b.desc)}</div>
    </div>`).join('');
}
