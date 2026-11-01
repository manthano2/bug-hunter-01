/* =========================================================
   BUG HUNTER — auth.js
   Login, register and logout. Everything is stored in
   Local Storage (see storage.js). No backend, no external login.
   ========================================================= */

/* Send logged-in players straight to the dashboard (used on login/register) */
function requireGuest(){
  if(Store.getSession()){
    window.location.replace('dashboard.html');
    return false;
  }
  return true;
}

/* Protect pages that need a logged-in player (dashboard, game) */
function requireAuth(){
  if(!Store.getSession()){
    window.location.replace('login.html');
    return false;
  }
  return true;
}

function logout(){
  Store.clearSession();
  window.location.href = 'index.html';
}

/* Show an error box and replay its shake animation */
function showAuthMessage(box, message){
  if(!box) return;
  box.textContent = message;
  box.classList.remove('show');
  void box.offsetWidth; // force reflow so the animation restarts
  box.classList.add('show');
}

function hideAuthMessage(box){
  if(box) box.classList.remove('show');
}

/* Show / hide password buttons */
function initPasswordToggles(){
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if(!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'HIDE' : 'SHOW';
      playSound('click');
    });
  });
}

/* ---------------- LOGIN ---------------- */
function initLoginForm(){
  const form = document.getElementById('loginForm');
  const errBox = document.getElementById('loginError');
  if(!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    playSound('click');

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if(!username || !password){
      showAuthMessage(errBox, 'Enter both your username and password.');
      playSound('wrong');
      return;
    }

    const result = Store.validateLogin(username, password);
    if(!result.ok){
      showAuthMessage(errBox, result.error);
      playSound('wrong');
      return;
    }

    hideAuthMessage(errBox);
    playSound('correct');
    Store.setSession(result.user.username); // use the saved spelling of the name
    Store.initProgress(result.user.username);

    const btn = document.getElementById('loginSubmit');
    if(btn){ btn.textContent = 'Access Granted...'; btn.disabled = true; }
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  });
}

/* ---------------- REGISTER ---------------- */
function initRegisterForm(){
  const form = document.getElementById('registerForm');
  const errBox = document.getElementById('registerError');
  const okBox = document.getElementById('registerSuccess');
  if(!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    playSound('click');

    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    hideAuthMessage(errBox);
    hideAuthMessage(okBox);

    const fail = (msg) => { showAuthMessage(errBox, msg); playSound('wrong'); };

    if(!/^[A-Za-z0-9_-]{3,16}$/.test(username)){
      return fail('Username must be 3-16 characters: letters, numbers, _ or -.');
    }
    if(password.length < 4){
      return fail('Password must be at least 4 characters.');
    }
    if(password !== confirm){
      return fail('Passwords do not match.');
    }

    const result = Store.registerUser(username, password);
    if(!result.ok){
      return fail(result.error);
    }

    playSound('correct');
    showAuthMessage(okBox, 'Agent registered! Redirecting to login...');
    const btn = document.getElementById('registerSubmit');
    if(btn) btn.disabled = true;
    setTimeout(() => { window.location.href = 'login.html'; }, 1100);
  });
}
