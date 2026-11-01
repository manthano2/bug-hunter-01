/* =========================================================
   BUG HUNTER — storage.js
   Every read/write to Local Storage lives in this file, so the
   rest of the app never touches localStorage directly.

   Keys used:
     bugHunter_users              -> [{ username, password, joined }]
     bugHunter_session            -> "username" of the logged-in player
     bugHunter_progress_<name>    -> progress object for that player
     bugHunter_draft_<name>_<id>  -> unsaved editor code for a level
     bugHunter_sound              -> true / false
   ========================================================= */

const StorageKeys = {
  USERS: 'bugHunter_users',
  SESSION: 'bugHunter_session',
  PROGRESS: 'bugHunter_progress_',
  DRAFT: 'bugHunter_draft_',
  SOUND: 'bugHunter_sound'
};

const Store = {

  /* ---------- low-level helpers (never throw) ---------- */
  _read(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    }catch(e){ return fallback; }
  },

  _write(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ return false; }
  },

  _remove(key){
    try{ localStorage.removeItem(key); }catch(e){ /* ignore */ }
  },

  /* ---------- users ---------- */
  getUsers(){
    const users = this._read(StorageKeys.USERS, []);
    return Array.isArray(users) ? users : [];
  },

  saveUsers(users){
    return this._write(StorageKeys.USERS, users);
  },

  findUser(username){
    const name = String(username || '').trim().toLowerCase();
    if(!name) return null;
    return this.getUsers().find(u => String(u.username).toLowerCase() === name) || null;
  },

  registerUser(username, password){
    username = String(username || '').trim();
    if(this.findUser(username)){
      return { ok:false, error:'That username is already taken.' };
    }
    const users = this.getUsers();
    const user = { username, password, joined: new Date().toISOString() };
    users.push(user);
    if(!this.saveUsers(users)){
      return { ok:false, error:'Could not save to Local Storage. Is storage blocked in this browser?' };
    }
    this.initProgress(username);
    return { ok:true, user };
  },

  validateLogin(username, password){
    const user = this.findUser(username);
    if(!user) return { ok:false, error:'No agent found with that username.' };
    if(user.password !== password) return { ok:false, error:'Incorrect password. Access denied.' };
    return { ok:true, user };
  },

  /* ---------- session ---------- */
  setSession(username){ this._write(StorageKeys.SESSION, username); },

  getSession(){
    const name = this._read(StorageKeys.SESSION, null);
    if(!name) return null;
    // if the account was deleted, drop the stale session
    const user = this.findUser(name);
    if(!user){ this.clearSession(); return null; }
    return user.username;
  },

  clearSession(){ this._remove(StorageKeys.SESSION); },

  /* ---------- progress ---------- */
  progressKey(username){
    return StorageKeys.PROGRESS + String(username).toLowerCase();
  },

  defaultProgress(){
    return {
      currentLevel: 1,        // highest level the player may open
      completedLevels: [],    // ids of finished levels
      score: 0,               // live score (XP minus hint penalties)
      bestScore: 0,           // highest score ever reached (leaderboard)
      hintsUsed: 0,           // total hints revealed
      hintsByLevel: {},       // levelId -> hints revealed on that level
      noHintLevels: [],       // levels solved without using any hint
      plays: 1                // how many times the game was started
    };
  },

  initProgress(username){
    if(this._read(this.progressKey(username), null) === null){
      this._write(this.progressKey(username), this.defaultProgress());
    }
  },

  getProgress(username){
    const saved = this._read(this.progressKey(username), null);
    const p = Object.assign(this.defaultProgress(), (saved && typeof saved === 'object') ? saved : {});
    if(!Array.isArray(p.completedLevels)) p.completedLevels = [];
    if(!Array.isArray(p.noHintLevels)) p.noHintLevels = [];
    if(!p.hintsByLevel || typeof p.hintsByLevel !== 'object') p.hintsByLevel = {};
    p.currentLevel = Math.max(1, Number(p.currentLevel) || 1);
    p.score = Number(p.score) || 0;   // may dip below 0 while hints are paid for; the UI shows it as 0
    p.bestScore = Math.max(Number(p.bestScore) || 0, p.score);
    p.hintsUsed = Math.max(0, Number(p.hintsUsed) || 0);
    return p;
  },

  saveProgress(username, progress){
    progress.bestScore = Math.max(Number(progress.bestScore) || 0, Number(progress.score) || 0);
    return this._write(this.progressKey(username), progress);
  },

  /* Start over: wipes levels / score / hints but keeps the best score */
  resetProgress(username){
    const old = this.getProgress(username);
    const fresh = this.defaultProgress();
    fresh.bestScore = old.bestScore;
    fresh.plays = (old.plays || 1) + 1;
    this._write(this.progressKey(username), fresh);
    this.clearAllDrafts(username);
  },

  /* ---------- editor drafts ---------- */
  draftKey(username, levelId){
    return StorageKeys.DRAFT + String(username).toLowerCase() + '_' + levelId;
  },
  getDraft(username, levelId){
    const d = this._read(this.draftKey(username, levelId), null);
    return typeof d === 'string' ? d : null;
  },
  saveDraft(username, levelId, code){
    this._write(this.draftKey(username, levelId), code);
  },
  clearDraft(username, levelId){
    this._remove(this.draftKey(username, levelId));
  },
  clearAllDrafts(username){
    for(let i = 1; i <= 50; i++) this.clearDraft(username, i);
  },

  /* ---------- sound preference ---------- */
  getSoundOn(){ return this._read(StorageKeys.SOUND, true) !== false; },
  setSoundOn(on){ this._write(StorageKeys.SOUND, !!on); },

  /* ---------- leaderboard ---------- */
  getLeaderboard(){
    return this.getUsers().map(u => {
      const p = this.getProgress(u.username);
      return {
        username: u.username,
        score: p.bestScore,
        completed: p.completedLevels.length,
        hints: p.hintsUsed
      };
    }).sort((a, b) => (b.score - a.score) || (b.completed - a.completed) || a.username.localeCompare(b.username));
  }
};
