# 🐛 Bug Hunter

A hacker-themed JavaScript debugging game with **20 levels**. Every level gives you a broken program: fix the bug, submit, earn XP and unlock the next mission.

Pure **HTML + CSS + vanilla JavaScript**. No backend, no build step, no installs. Everything is saved in your browser's Local Storage.

---

## ▶ How to run it in VS Code

**Option A: Live Server (recommended)**
1. Unzip the folder and open it in VS Code (`File → Open Folder…`).
2. Install the **Live Server** extension (by Ritwick Dey) from the Extensions tab.
3. Right-click `index.html` → **Open with Live Server**.
4. The game opens in your browser. Click **Start Hunting**.

**Option B: no extension at all**
- Double-click `index.html` (or right-click it in VS Code → *Reveal in File Explorer* → open with Chrome / Edge / Firefox). It works straight from the file system.

> The game was tested in Chromium opening the files directly (`file://`), so both options work.

---

## 🎮 How to play

1. **Register** an account (stored only in this browser), then **Login**.
2. On the **Dashboard**, open **Level 1** (the others are locked).
3. Read the problem and the *Expected output*, then fix the code in the editor.
4. **Run Code** to test it (output appears in the console panel). `Ctrl + Enter` also runs.
5. **Submit** to be graded. Correct = **+100 XP**, confetti, and the next level unlocks.
6. Stuck? Use **Hint** (3 per level). Each hint costs **10 points**.
7. Finish all 20 levels to become an **Official Bug Hunter** 🏆.

### Scoring
| Action | Points |
|---|---|
| Correct submission (first time) | +100 |
| Wrong submission | 0 |
| Each hint | −10 |

Ranks: Script Kiddie → Rookie Hunter → Bug Tracker → Code Breaker → Elite Hunter → Master Hunter.
Badges: First Bug Fixed · Bug Hunter (5 levels) · Debugger (10 levels) · Clean Coder (3 levels, no hints) · Master Hunter (all 20).

---

## 📁 Project structure

```
bug-hunter/
├── index.html       Landing page (boot screen, features, level roadmap)
├── login.html       Login page
├── register.html    Registration page
├── dashboard.html   Stats, XP bar, 20 level cards, badges
├── game.html        The game: editor, console, hints, buttons
├── style.css        All styling (glassmorphism, animations, responsive)
├── script.js        Shared UI: sound, background, navbar, modals, dashboard
├── auth.js          Login / register / logout logic
├── storage.js       Every Local Storage read/write lives here
├── levels.js        The 20 levels, hints and the grading function
└── game.js          Editor, safe code runner, scoring, popups, confetti
```

---

## ➕ Adding your own level

Open `levels.js`, copy any level object and add it at the end of the `LEVELS` array:

```js
{
  id: 21,
  title: 'My New Bug',
  topic: 'What it teaches',
  difficulty: 'Hard',            // Beginner | Easy | Medium | Hard | Boss
  description: 'What the program should do…',
  broken: 'let x = 1\nconsole.log(y)',
  expected: ['1'],               // what the FIXED code must print, one entry per line
  requires: [/console\.log\(\s*x\s*\)/],   // patterns the fixed code must contain
  forbids: [/\by\b/],                       // patterns it must NOT contain
  hints: ['hint 1', 'hint 2', 'hint 3'],
  explanation: 'Shown in the popup after solving.'
}
```

The dashboard, level count, XP bar and game-complete screen all update automatically.
(If you add levels, also update the `min` XP values in `RANKS` in `script.js` and the "20 levels" wording on the landing page.)

---

## 🔧 Notes & troubleshooting

- **Fonts:** Poppins and Fira Code load from Google Fonts. Offline, the game falls back to system fonts and still works.
- **Progress is per browser.** Clearing site data erases accounts and progress. Use *Profile → Reset Progress* to restart; your best score stays on the leaderboard.
- **Passwords are stored in plain text** in Local Storage because there is no server. This is fine for a local game, so don't reuse a real password.
- **Infinite loops are safe:** your code runs in a Web Worker with a 2-second time limit, so the page can't freeze.
- **Sound:** toggle with the 🔊 button in the navbar.
