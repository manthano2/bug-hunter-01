/* =========================================================
   BUG HUNTER — game.js
   Powers game.html: the code editor, the safe code runner,
   Run / Submit / Hint / Reset / Next buttons, scoring,
   the level-complete popup, confetti and the final trophy screen.
   ========================================================= */

/* ---------------- RUNNING THE PLAYER'S CODE ----------------
   The player's code runs inside a Web Worker. If it never finishes
   (an infinite loop) the worker is terminated after a time limit, so
   the page can never freeze. Output is captured through a fake console. */

const RUN_TIMEOUT_MS = 2000;

/* This function is stringified and also used inside the worker, so it
   must stay self-contained (no outside variables). */
function executeUserCode(code){
  var output = [];
  var error = null;
  var MAX_LOGS = 500;

  function format(a){
    if(a === undefined) return 'undefined';
    if(a === null) return 'null';
    if(typeof a === 'object'){
      try{ return JSON.stringify(a); }catch(e){ return String(a); }
    }
    return String(a);
  }

  function logger(){
    var parts = [];
    for(var i = 0; i < arguments.length; i++) parts.push(format(arguments[i]));
    output.push(parts.join(' '));
    if(output.length > MAX_LOGS){
      throw new Error('Too many console.log calls. Possible infinite loop.');
    }
  }

  var fakeConsole = { log: logger, info: logger, warn: logger, error: logger };

  try{
    var fn = new Function('console', '"use strict";\n' + code);
    fn(fakeConsole);
  }catch(err){
    error = (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : String(err));
  }
  return { output: output, error: error, timedOut: false };
}

function buildWorkerBlob(){
  const src = 'self.postMessage({ready:true});' +
              'self.onmessage=function(e){self.postMessage((' + executeUserCode.toString() + ')(e.data.code));};';
  return new Blob([src], { type: 'text/javascript' });
}

/* Returns a Promise of { output, error, timedOut } */
function runUserCode(code){
  return new Promise(resolve => {
    let done = false;
    let worker = null;
    let url = null;
    let startTimer = null;
    let runTimer = null;

    function cleanup(){
      clearTimeout(startTimer);
      clearTimeout(runTimer);
      try{ if(worker) worker.terminate(); }catch(e){ /* ignore */ }
      try{ if(url) URL.revokeObjectURL(url); }catch(e){ /* ignore */ }
    }
    function finish(result){
      if(done) return;
      done = true;
      cleanup();
      resolve(result);
    }
    // Used only if Web Workers are unavailable in this browser
    function fallback(){
      if(done) return;
      finish(executeUserCode(code));
    }

    try{
      url = URL.createObjectURL(buildWorkerBlob());
      worker = new Worker(url);
    }catch(e){
      fallback();
      return;
    }

    startTimer = setTimeout(fallback, 1500);   // worker never started
    worker.onerror = fallback;
    worker.onmessage = (ev) => {
      const data = ev.data;
      if(data && data.ready){
        clearTimeout(startTimer);
        runTimer = setTimeout(() => {
          finish({ output: [], error: null, timedOut: true });
        }, RUN_TIMEOUT_MS);
        worker.postMessage({ code: code });
        return;
      }
      finish(data);
    };
  });
}

/* ---------------- SYNTAX HIGHLIGHTING ----------------
   One pass over the raw text, so keywords inside strings or
   comments are never coloured twice. */
function tokenize(code){
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\b(let|const|var|function|return|if|else|for|while|do|switch|case|break|continue|new|typeof|true|false|null|undefined|of|in)\b|\b(\d+(?:\.\d+)?)\b|\b(console|Math|Number|Array|Object|String|JSON)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
  let out = '';
  let last = 0;
  let m;
  while((m = re.exec(code)) !== null){
    out += escapeHtml(code.slice(last, m.index));
    const cls = m[1] ? 'tok-com' : m[2] ? 'tok-str' : m[3] ? 'tok-kw' : m[4] ? 'tok-num' : m[5] ? 'tok-obj' : 'tok-fn';
    out += '<span class="' + cls + '">' + escapeHtml(m[0]) + '</span>';
    last = re.lastIndex;
  }
  out += escapeHtml(code.slice(last));
  return out + '\n';   // trailing newline keeps both layers the same height
}

/* ---------------- GAME STATE ---------------- */
let username = null;
let level = null;
let progress = null;
let busy = false;
let draftTimer = null;

function getLevelIdFromUrl(){
  const raw = new URLSearchParams(window.location.search).get('level');
  if(raw === null) return 1;
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}

/* ---------------- INIT ---------------- */
function initGame(){
  if(!requireAuth()) return;

  username = Store.getSession();
  progress = Store.getProgress(username);
  const id = getLevelIdFromUrl();
  level = getLevel(id);
  const unlocked = Math.min(progress.currentLevel, TOTAL_LEVELS);

  // unknown level, or a locked one reached by editing the URL
  if(!level || id > unlocked){
    window.location.replace('dashboard.html');
    return;
  }

  initBackground();
  buildNavbar({ active: 'levels' });
  buildFooter();

  // fill the level info
  $('lvPill').textContent = 'LEVEL ' + String(level.id).padStart(2, '0') + ' / ' + TOTAL_LEVELS;
  $('lvTitle').textContent = level.title;
  $('lvTopic').textContent = level.topic;
  $('lvDesc').textContent = level.description;
  const diff = $('lvDiff');
  diff.textContent = level.difficulty;
  diff.className = 'diff diff-' + level.difficulty.toLowerCase();
  $('expectedBox').textContent = level.expected.join('\n');
  $('fileName').textContent = 'level_' + String(level.id).padStart(2, '0') + '.js';
  updateScore();

  // editor starts with a saved draft (if any) or the broken code
  const draft = Store.getDraft(username, level.id);
  setEditorCode(draft !== null ? draft : level.broken);
  clearConsole();
  renderHints();
  updateNextButton();

  // buttons
  $('btnRun').addEventListener('click', onRun);
  $('btnSubmit').addEventListener('click', onSubmit);
  $('btnHint').addEventListener('click', onHint);
  $('btnReset').addEventListener('click', onReset);
  $('btnNext').addEventListener('click', onNext);
  $('btnClearConsole').addEventListener('click', () => { playSound('click'); clearConsole(); });

  // editor behaviour
  const input = $('codeInput');
  input.addEventListener('input', onEditorInput);
  input.addEventListener('scroll', syncScroll);
  input.addEventListener('keydown', onEditorKeydown);
}

/* ---------------- EDITOR ---------------- */
function setEditorCode(code){
  $('codeInput').value = code;
  refreshEditor();
  $('codeInput').scrollTop = 0;
  $('codeInput').scrollLeft = 0;
  syncScroll();
}

function refreshEditor(){
  const code = $('codeInput').value;
  $('codeHighlight').innerHTML = tokenize(code);
  const lines = code.split('\n').length;
  let nums = '';
  for(let i = 1; i <= lines; i++) nums += i + '\n';
  $('gutter').textContent = nums;
  syncScroll();
}

function syncScroll(){
  const input = $('codeInput');
  const layer = $('codeHighlight');
  layer.scrollTop = input.scrollTop;
  layer.scrollLeft = input.scrollLeft;
  $('gutter').scrollTop = input.scrollTop;
}

function onEditorInput(){
  refreshEditor();
  // autosave the draft shortly after the player stops typing
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    Store.saveDraft(username, level.id, $('codeInput').value);
  }, 400);
}

/* Insert text at the cursor while keeping the browser's undo history */
function insertText(text){
  const input = $('codeInput');
  input.focus();
  let ok = false;
  try{ ok = document.execCommand('insertText', false, text); }catch(e){ ok = false; }
  if(!ok){
    input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
    onEditorInput();
  }
}

function onEditorKeydown(e){
  if(e.key === 'Tab'){
    e.preventDefault();
    insertText('  ');
  }else if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){
    e.preventDefault();
    onRun();
  }else if(e.key === 'Enter' && !e.shiftKey && !e.altKey){
    // auto-indent: keep the previous line's indentation, add 2 spaces after {
    const input = $('codeInput');
    const before = input.value.slice(0, input.selectionStart);
    const line = before.slice(before.lastIndexOf('\n') + 1);
    const indent = line.match(/^[ \t]*/)[0];
    const extra = /\{\s*$/.test(line) ? '  ' : '';
    e.preventDefault();
    insertText('\n' + indent + extra);
  }
}

/* ---------------- CONSOLE & STATUS ---------------- */
function clearConsole(){
  $('consoleOut').innerHTML = '<span class="muted-line">// press Run Code to see the output here</span>';
}

function renderConsole(result){
  let html = '';
  if(result.output.length){
    html += result.output.map(l => '<span class="out-line">&gt; ' + escapeHtml(l) + '</span>').join('\n');
  }
  if(result.timedOut){
    html += (html ? '\n' : '') + '<span class="err">✖ Time limit exceeded. Your code may contain an infinite loop.</span>';
  }else if(result.error){
    html += (html ? '\n' : '') + '<span class="err">✖ ' + escapeHtml(result.error) + '</span>';
  }
  if(!html) html = '<span class="muted-line">// no output</span>';
  $('consoleOut').innerHTML = html;
}

function showStatus(message, type){
  const el = $('statusMsg');
  el.textContent = message;
  el.className = 'status-msg show ' + type;
}

function hideStatus(){
  $('statusMsg').className = 'status-msg';
}

function updateScore(){
  $('scorePill').textContent = 'SCORE: ' + displayScore(progress) + ' XP';
}

function setBusy(on){
  busy = on;
  $('btnRun').disabled = on;
  $('btnSubmit').disabled = on;
  $('btnRun').textContent = on ? '⏳ Running...' : '▶ Run Code';
}

/* ---------------- BUTTON HANDLERS ---------------- */
async function onRun(){
  if(busy) return;
  playSound('click');
  hideStatus();
  setBusy(true);
  const result = await runUserCode($('codeInput').value);
  renderConsole(result);
  setBusy(false);
}

async function onSubmit(){
  if(busy) return;
  playSound('click');
  setBusy(true);
  const code = $('codeInput').value;
  const result = await runUserCode(code);
  renderConsole(result);
  setBusy(false);

  const verdict = gradeLevel(level, code, result);
  if(!verdict.passed){
    playSound('wrong');
    showStatus('✖ Not yet. ' + verdict.reason, 'fail');
    const shell = document.querySelector('.editor-shell');
    shell.classList.remove('shake');
    void shell.offsetWidth;
    shell.classList.add('shake');
    return;
  }

  showStatus('✔ Mission Complete! Bug squashed.', 'ok');
  playSound('correct');
  completeLevel();
}

function onHint(){
  const used = progress.hintsByLevel[level.id] || 0;
  if(used >= level.hints.length) return;

  const alreadyDone = progress.completedLevels.includes(level.id);
  progress.hintsByLevel[level.id] = used + 1;
  progress.hintsUsed += 1;
  if(!alreadyDone){
    progress.score -= HINT_COST;   // every hint costs points (shown as 0 if below zero)
  }
  Store.saveProgress(username, progress);

  playSound('hint');
  updateScore();
  renderHints();
}

function renderHints(){
  const used = progress.hintsByLevel[level.id] || 0;
  const total = level.hints.length;
  const alreadyDone = progress.completedLevels.includes(level.id);

  $('hintList').innerHTML = level.hints.slice(0, used).map((h, i) =>
    '<div class="hint-item"><strong>Hint ' + (i + 1) + ':</strong> ' + escapeHtml(h) + '</div>'
  ).join('');

  const btn = $('btnHint');
  if(used >= total){
    btn.textContent = 'No more hints';
    btn.disabled = true;
  }else{
    btn.textContent = '💡 Hint (' + used + '/' + total + ')' + (alreadyDone ? '' : '  −' + HINT_COST + ' pts');
    btn.disabled = false;
  }
}

function onReset(){
  playSound('click');
  Store.clearDraft(username, level.id);
  setEditorCode(level.broken);
  clearConsole();
  hideStatus();
}

function onNext(){
  playSound('click');
  if(level.id >= TOTAL_LEVELS){
    window.location.href = 'dashboard.html';
    return;
  }
  window.location.href = 'game.html?level=' + (level.id + 1);
}

function updateNextButton(){
  const done = progress.completedLevels.includes(level.id);
  const btn = $('btnNext');
  btn.disabled = !done;
  btn.textContent = level.id >= TOTAL_LEVELS ? 'Finish →' : 'Next Level →';
}

/* ---------------- LEVEL COMPLETE ---------------- */
function completeLevel(){
  const first = !progress.completedLevels.includes(level.id);
  const badgesBefore = getEarnedBadges(progress).map(b => b.id);
  const xp = first ? XP_PER_LEVEL : 0;

  if(first){
    progress.completedLevels.push(level.id);
    progress.score += xp;
    progress.currentLevel = Math.max(progress.currentLevel, Math.min(level.id + 1, TOTAL_LEVELS));
    if((progress.hintsByLevel[level.id] || 0) === 0 && !progress.noHintLevels.includes(level.id)){
      progress.noHintLevels.push(level.id);
    }
  }
  Store.saveProgress(username, progress);
  Store.saveDraft(username, level.id, $('codeInput').value);

  updateScore();
  updateNextButton();
  renderHints();

  const newBadges = getEarnedBadges(progress).filter(b => badgesBefore.indexOf(b.id) === -1);

  setTimeout(() => {
    playSound('level');
    launchConfetti();
    if(first && level.id === TOTAL_LEVELS){
      showGameCompleteModal();
    }else{
      showLevelCompleteModal(xp, newBadges);
    }
  }, 350);
}

function ensureGameModal(){
  if($('gameModal')) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'confettiCanvas';
  document.body.appendChild(canvas);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'gameModal';
  overlay.innerHTML = `
    <div class="glass modal-box" role="dialog" aria-modal="true">
      <div class="modal-icon" id="gameModalIcon"></div>
      <h2 id="gameModalTitle"></h2>
      <p class="modal-sub" id="gameModalSub"></p>
      <div id="gameModalBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeGameModal();
  });
}

function closeGameModal(){
  const m = $('gameModal');
  if(m) m.classList.remove('show');
}

function showLevelCompleteModal(xp, newBadges){
  ensureGameModal();
  $('gameModalIcon').textContent = '🎉';
  $('gameModalTitle').textContent = 'LEVEL COMPLETE';
  $('gameModalSub').textContent = xp > 0 ? 'Mission Complete!' : 'Level already completed — no extra XP.';

  const badgeHtml = newBadges.length
    ? '<div class="new-badges">' + newBadges.map(b => '<span class="mini-badge on">' + b.icon + ' New badge: ' + escapeHtml(b.name) + '</span>').join('') + '</div>'
    : '';
  const isLast = level.id >= TOTAL_LEVELS;

  $('gameModalBody').innerHTML = `
    <div class="modal-stats">
      <div><div class="m-val">+${xp}</div><div class="m-lbl">XP Earned</div></div>
      <div><div class="m-val">${displayScore(progress)}</div><div class="m-lbl">Score</div></div>
    </div>
    <div class="explain"><strong>What was the bug?</strong> ${escapeHtml(level.explanation)}</div>
    ${badgeHtml}
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modalStay" type="button">Review Code</button>
      <button class="btn btn-primary" id="modalNext" type="button">${isLast ? 'Dashboard →' : 'Next Level →'}</button>
    </div>`;
  $('gameModal').classList.add('show');
  $('modalStay').addEventListener('click', () => { playSound('click'); closeGameModal(); });
  $('modalNext').addEventListener('click', onNext);
}

function showGameCompleteModal(){
  ensureGameModal();
  $('gameModalIcon').innerHTML = '<span class="trophy">🏆</span>';
  $('gameModalTitle').textContent = 'Congratulations!';
  $('gameModalSub').textContent = 'You are now an Official Bug Hunter!';
  $('gameModalBody').innerHTML = `
    <div class="modal-stats">
      <div><div class="m-val">${displayScore(progress)}</div><div class="m-lbl">Final Score</div></div>
      <div><div class="m-val">${progress.hintsUsed}</div><div class="m-lbl">Hints Used</div></div>
      <div><div class="m-val">${progress.completedLevels.length}/${TOTAL_LEVELS}</div><div class="m-lbl">Levels Completed</div></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modalDash" type="button">Dashboard</button>
      <button class="btn btn-primary" id="modalAgain" type="button">Play Again</button>
    </div>`;
  $('gameModal').classList.add('show');
  $('modalDash').addEventListener('click', () => { playSound('click'); window.location.href = 'dashboard.html'; });
  $('modalAgain').addEventListener('click', () => {
    playSound('click');
    if(confirm('Start again from Level 1? Your best score stays on the leaderboard.')){
      Store.resetProgress(username);
      window.location.href = 'game.html?level=1';
    }
  });
}

/* ---------------- CONFETTI (canvas, no libraries) ---------------- */
function launchConfetti(){
  ensureGameModal();
  const canvas = $('confettiCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#00FF88', '#00C2FF', '#FFC93C', '#FF4D6D', '#EAF2FF'];
  const pieces = [];
  for(let i = 0; i < 150; i++){
    pieces.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.6,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 2.2 + Math.random() * 3.2,
      vx: -2 + Math.random() * 4,
      rot: Math.random() * 360,
      vr: -9 + Math.random() * 18
    });
  }

  let frame = 0;
  function tick(){
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if(frame < 170){
      requestAnimationFrame(tick);
    }else{
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  tick();
}
