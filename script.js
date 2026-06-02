/* ============================================================
   MINI GAMES HUB — script.js
   All game logic, navigation, animations, and local storage
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────
   NAVIGATION
   ────────────────────────────────────────────────────────── */
const screens = document.querySelectorAll('.screen');

/** Show a screen by id, hide all others */
function showScreen(id) {
  screens.forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

// Game card clicks → open game
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    const game = card.dataset.game;
    showScreen(game);
    if (game === 'memory') initMemory();
  });
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') card.click();
  });
});

// Back buttons → home
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    showScreen('home');
    updateHighScores();
  });
});

/* ──────────────────────────────────────────────────────────
   THEME TOGGLE (Dark / Light)
   ────────────────────────────────────────────────────────── */
const themeBtn = document.getElementById('theme-toggle');
let isDark = true;

// Restore from localStorage
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
  themeBtn.textContent = '☀️';
  isDark = false;
}

themeBtn.addEventListener('click', () => {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  themeBtn.textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

/* ──────────────────────────────────────────────────────────
   SOUND EFFECTS (Web Audio API — no external files)
   ────────────────────────────────────────────────────────── */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/**
 * Play a quick beep/tone
 * @param {number} freq - frequency in Hz
 * @param {string} type - oscillator type
 * @param {number} duration - in seconds
 * @param {number} vol - volume 0–1
 */
function playTone(freq, type = 'sine', duration = 0.12, vol = 0.18) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) { /* silence any audio errors */ }
}

function sfxClick()   { playTone(440, 'square', 0.06, 0.12); }
function sfxWin()     { [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.2, 0.2), i * 130)); }
function sfxLose()    { playTone(220, 'sawtooth', 0.3, 0.15); }
function sfxMatch()   { playTone(880, 'sine', 0.15, 0.18); }
function sfxFlip()    { playTone(660, 'triangle', 0.07, 0.1); }

/* ──────────────────────────────────────────────────────────
   CONFETTI
   ────────────────────────────────────────────────────────── */
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx2d = confettiCanvas.getContext('2d');
let confettiPieces = [];
let confettiAnimId = null;

function resizeConfettiCanvas() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeConfettiCanvas();
window.addEventListener('resize', resizeConfettiCanvas);

function launchConfetti() {
  resizeConfettiCanvas();
  confettiPieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -10 - Math.random() * 200,
    r: 4 + Math.random() * 6,
    d: 2 + Math.random() * 4,
    color: ['#00f5ff','#ff2d78','#f5e642','#39ff14','#bf5fff'][Math.floor(Math.random()*5)],
    tilt: Math.random() * 10 - 5,
    tiltSpd: 0.05 + Math.random() * 0.1
  }));
  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  animateConfetti();
  setTimeout(stopConfetti, 3000);
}

function animateConfetti() {
  ctx2d.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces.forEach(p => {
    ctx2d.beginPath();
    ctx2d.fillStyle = p.color;
    ctx2d.ellipse(p.x, p.y, p.r, p.r * 0.5, p.tilt, 0, Math.PI * 2);
    ctx2d.fill();
    p.y += p.d;
    p.x += Math.sin(p.y * 0.04) * 1.5;
    p.tilt += p.tiltSpd;
    if (p.y > confettiCanvas.height) {
      p.y = -10; p.x = Math.random() * confettiCanvas.width;
    }
  });
  confettiAnimId = requestAnimationFrame(animateConfetti);
}

function stopConfetti() {
  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  ctx2d.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces = [];
}

/* ──────────────────────────────────────────────────────────
   HIGH SCORES (localStorage)
   ────────────────────────────────────────────────────────── */
function getHS(key, def = null) {
  const v = localStorage.getItem('mgh_' + key);
  return v !== null ? JSON.parse(v) : def;
}
function setHS(key, val) {
  localStorage.setItem('mgh_' + key, JSON.stringify(val));
}

function updateHighScores() {
  document.getElementById('hs-rps').textContent    = getHS('rps_wins', 0);
  const mb = getHS('mem_best', null);
  document.getElementById('hs-memory').textContent = mb ? mb + 's' : '--';
  const gb = getHS('guess_best', null);
  document.getElementById('hs-guess').textContent  = gb ? gb + ' tries' : '--';
}
updateHighScores();

/* ══════════════════════════════════════════════════════════
   GAME 1 — TIC TAC TOE
   ══════════════════════════════════════════════════════════ */
(function TicTacToe() {
  // State
  let board       = Array(9).fill('');
  let currentPlayer = 'X';
  let gameOver    = false;
  let scores      = { X: getHS('ttt_x', 0), O: getHS('ttt_o', 0), D: getHS('ttt_d', 0) };

  // DOM refs
  const cells     = document.querySelectorAll('.ttt-cell');
  const status    = document.getElementById('ttt-status');
  const scoreX    = document.getElementById('score-x');
  const scoreO    = document.getElementById('score-o');
  const scoreDraw = document.getElementById('score-draw');
  const restartBtn= document.getElementById('ttt-restart');

  const WIN_COMBOS = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diags
  ];

  function renderScores() {
    scoreX.textContent    = scores.X;
    scoreO.textContent    = scores.O;
    scoreDraw.textContent = scores.D;
  }

  function updateStatus() {
    const cls = currentPlayer === 'X' ? 'ttt-x' : 'ttt-o';
    status.innerHTML = `Player <span class="${cls}">${currentPlayer}</span>'s Turn`;
  }

  function checkWinner() {
    for (const [a, b, c] of WIN_COMBOS) {
      if (board[a] && board[a] === board[b] && board[b] === board[c]) {
        return { winner: board[a], combo: [a, b, c] };
      }
    }
    if (board.every(cell => cell !== '')) return { winner: 'DRAW' };
    return null;
  }

  function handleCellClick(e) {
    const idx = +e.target.dataset.index;
    if (board[idx] || gameOver) return;

    sfxClick();
    board[idx] = currentPlayer;
    const cell = cells[idx];
    cell.textContent = currentPlayer;
    cell.classList.add('taken', currentPlayer === 'X' ? 'x-mark' : 'o-mark');

    const result = checkWinner();
    if (result) {
      gameOver = true;
      if (result.winner === 'DRAW') {
        status.innerHTML = `<span class="ttt-o">DRAW!</span>`;
        scores.D++;
        setHS('ttt_d', scores.D);
        sfxLose();
      } else {
        const cls = result.winner === 'X' ? 'ttt-x' : 'ttt-o';
        status.innerHTML = `<span class="${cls}">${result.winner} WINS! 🎉</span>`;
        result.combo.forEach(i => cells[i].classList.add('winner'));
        scores[result.winner]++;
        setHS('ttt_' + result.winner.toLowerCase(), scores[result.winner]);
        sfxWin();
        launchConfetti();
      }
      renderScores();
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      updateStatus();
    }
  }

  function restart() {
    board         = Array(9).fill('');
    currentPlayer = 'X';
    gameOver      = false;
    cells.forEach(cell => {
      cell.textContent = '';
      cell.className   = 'ttt-cell';
    });
    updateStatus();
    stopConfetti();
  }

  cells.forEach(cell => cell.addEventListener('click', handleCellClick));
  restartBtn.addEventListener('click', () => { sfxClick(); restart(); });

  renderScores();
  updateStatus();
})();

/* ══════════════════════════════════════════════════════════
   GAME 2 — ROCK PAPER SCISSORS
   ══════════════════════════════════════════════════════════ */
(function RockPaperScissors() {
  const CHOICES  = ['rock', 'paper', 'scissors'];
  const EMOJIS   = { rock: '✊', paper: '✋', scissors: '✌️' };
  const BEATS    = { rock: 'scissors', paper: 'rock', scissors: 'paper' }; // key beats value

  let wins   = getHS('rps_wins', 0);
  let draws  = getHS('rps_draws', 0);
  let losses = getHS('rps_losses', 0);

  const playerDisp = document.getElementById('player-choice');
  const cpuDisp    = document.getElementById('cpu-choice');
  const resultDisp = document.getElementById('rps-result');
  const winsEl     = document.getElementById('rps-wins');
  const drawsEl    = document.getElementById('rps-draws');
  const lossesEl   = document.getElementById('rps-losses');
  const resetBtn   = document.getElementById('rps-reset');

  function renderScores() {
    winsEl.textContent   = wins;
    drawsEl.textContent  = draws;
    lossesEl.textContent = losses;
  }

  function play(playerChoice) {
    sfxClick();
    const cpuChoice = CHOICES[Math.floor(Math.random() * 3)];

    // Animate choices
    playerDisp.classList.remove('bounce');
    cpuDisp.classList.remove('bounce');
    void playerDisp.offsetWidth; // reflow to restart animation
    void cpuDisp.offsetWidth;

    playerDisp.textContent = EMOJIS[playerChoice];
    cpuDisp.textContent    = EMOJIS[cpuChoice];
    playerDisp.classList.add('bounce');
    cpuDisp.classList.add('bounce');

    resultDisp.className = 'rps-result';

    // Determine result
    let outcome;
    if (playerChoice === cpuChoice) {
      outcome = 'DRAW 🤝';
      resultDisp.classList.add('draw');
      draws++;
      setHS('rps_draws', draws);
      sfxLose();
    } else if (BEATS[playerChoice] === cpuChoice) {
      outcome = 'YOU WIN! 🎉';
      resultDisp.classList.add('win');
      wins++;
      setHS('rps_wins', wins);
      sfxWin();
    } else {
      outcome = 'YOU LOSE 💀';
      resultDisp.classList.add('lose');
      losses++;
      setHS('rps_losses', losses);
      sfxLose();
    }

    resultDisp.textContent = outcome;
    renderScores();
  }

  document.querySelectorAll('.rps-btn').forEach(btn => {
    btn.addEventListener('click', () => play(btn.dataset.choice));
  });

  resetBtn.addEventListener('click', () => {
    wins = draws = losses = 0;
    ['rps_wins','rps_draws','rps_losses'].forEach(k => setHS(k, 0));
    playerDisp.textContent = cpuDisp.textContent = '❓';
    resultDisp.className   = 'rps-result';
    resultDisp.textContent = 'Make your move!';
    renderScores();
    sfxClick();
  });

  renderScores();
})();

/* ══════════════════════════════════════════════════════════
   GAME 3 — GUESS THE NUMBER
   ══════════════════════════════════════════════════════════ */
(function GuessTheNumber() {
  let secret, attempts, gameActive;

  const hintEl    = document.getElementById('guess-hint');
  const attemptsEl= document.getElementById('guess-attempts');
  const bestEl    = document.getElementById('guess-best');
  const thermoBar = document.getElementById('thermo-bar');
  const historyEl = document.getElementById('guess-history');
  const input     = document.getElementById('guess-input');
  const submitBtn = document.getElementById('guess-submit');
  const restartBtn= document.getElementById('guess-restart');

  function initGame() {
    secret      = Math.floor(Math.random() * 100) + 1;
    attempts    = 0;
    gameActive  = true;
    hintEl.textContent = "I'm thinking of a number…";
    hintEl.className   = 'guess-hint';
    attemptsEl.textContent = 0;
    thermoBar.style.width   = '50%';
    historyEl.innerHTML     = '';
    input.value             = '';
    input.disabled          = false;
    submitBtn.disabled      = false;
    input.focus();
    updateBestDisplay();
    sfxClick();
  }

  function updateBestDisplay() {
    const best = getHS('guess_best', null);
    bestEl.textContent = best ? best + ' tries' : '--';
    document.getElementById('guess-best').textContent = best ? best + ' tries' : '--';
  }

  function guess() {
    if (!gameActive) return;
    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1 || val > 100) {
      hintEl.textContent = 'Enter a number between 1 and 100!';
      hintEl.className   = 'guess-hint';
      return;
    }

    attempts++;
    attemptsEl.textContent = attempts;
    sfxClick();

    // Add pill to history
    const pill = document.createElement('span');
    pill.className = 'guess-pill';

    if (val === secret) {
      hintEl.textContent = `🎉 YES! It was ${secret}! (${attempts} tries)`;
      hintEl.className   = 'guess-hint correct';
      pill.textContent   = `${val} ✓`;
      pill.style.borderColor = '#39ff14';
      pill.style.color       = '#39ff14';
      input.disabled    = true;
      submitBtn.disabled= true;
      gameActive        = false;
      sfxWin();
      launchConfetti();
      // Save best
      const prev = getHS('guess_best', null);
      if (!prev || attempts < prev) {
        setHS('guess_best', attempts);
        updateBestDisplay();
      }
    } else if (val > secret) {
      hintEl.textContent = `📉 Too High! Try lower.`;
      hintEl.className   = 'guess-hint too-high';
      pill.className     = 'guess-pill high';
      pill.textContent   = `${val} ↑`;
      thermoBar.style.width = Math.max(5, ((val - 1) / 99) * 100) + '%';
      sfxLose();
    } else {
      hintEl.textContent = `📈 Too Low! Try higher.`;
      hintEl.className   = 'guess-hint too-low';
      pill.className     = 'guess-pill low';
      pill.textContent   = `${val} ↓`;
      thermoBar.style.width = Math.max(5, ((val - 1) / 99) * 100) + '%';
      sfxClick();
    }

    historyEl.prepend(pill);
    input.value = '';
    input.focus();
  }

  submitBtn.addEventListener('click', guess);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') guess(); });
  restartBtn.addEventListener('click', initGame);

  initGame();
})();

/* ══════════════════════════════════════════════════════════
   GAME 4 — MEMORY CARD FLIP
   ══════════════════════════════════════════════════════════ */
const CARD_EMOJIS = ['🐉','🌙','⚡','🎯','🔥','💎','🚀','🎸','🌊','🦋','🍄','🎪'];

let memState = {
  cards: [], flipped: [], matched: 0,
  moves: 0, locked: false,
  timer: null, seconds: 0
};

function initMemory() {
  // Pick 8 pairs (16 cards)
  const pool   = CARD_EMOJIS.slice(0, 8);
  const paired = [...pool, ...pool];
  // Shuffle (Fisher-Yates)
  for (let i = paired.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [paired[i], paired[j]] = [paired[j], paired[i]];
  }

  memState = { cards: paired, flipped: [], matched: 0, moves: 0, locked: false, timer: null, seconds: 0 };

  clearInterval(memState.timer);
  document.getElementById('mem-moves').textContent = 0;
  document.getElementById('mem-time').textContent  = '0s';
  updateMemBest();
  renderMemoryGrid(paired);
}

function updateMemBest() {
  const best = getHS('mem_best', null);
  document.getElementById('mem-best').textContent = best ? best + 's' : '--';
}

function renderMemoryGrid(cards) {
  const grid = document.getElementById('memory-grid');
  grid.innerHTML = '';
  cards.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className     = 'mem-card';
    card.dataset.index = i;
    card.dataset.value = emoji;
    card.innerHTML = `
      <div class="mem-card-inner">
        <div class="mem-face mem-front">🂠</div>
        <div class="mem-face mem-back">${emoji}</div>
      </div>`;
    card.addEventListener('click', onCardClick);
    grid.appendChild(card);
  });
}

function onCardClick(e) {
  const card = e.currentTarget;
  if (memState.locked) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (memState.flipped.length >= 2) return;

  sfxFlip();
  card.classList.add('flipped');
  memState.flipped.push(card);

  // Start timer on first flip
  if (memState.moves === 0 && memState.flipped.length === 1) {
    memState.timer = setInterval(() => {
      memState.seconds++;
      document.getElementById('mem-time').textContent = memState.seconds + 's';
    }, 1000);
  }

  if (memState.flipped.length === 2) {
    memState.moves++;
    document.getElementById('mem-moves').textContent = memState.moves;
    checkMemMatch();
  }
}

function checkMemMatch() {
  const [a, b] = memState.flipped;
  if (a.dataset.value === b.dataset.value) {
    // Match!
    setTimeout(() => {
      a.classList.add('matched');
      b.classList.add('matched');
      sfxMatch();
      memState.flipped = [];
      memState.matched++;

      if (memState.matched === memState.cards.length / 2) {
        // All matched — game over
        clearInterval(memState.timer);
        sfxWin();
        launchConfetti();
        const time = memState.seconds;
        const prev = getHS('mem_best', null);
        if (!prev || time < prev) {
          setHS('mem_best', time);
          updateMemBest();
        }
        setTimeout(() => {
          alert(`🎉 You matched all pairs in ${memState.moves} moves & ${time}s!`);
        }, 600);
      }
    }, 400);
  } else {
    // No match — flip back
    memState.locked = true;
    setTimeout(() => {
      a.classList.remove('flipped');
      b.classList.remove('flipped');
      memState.flipped = [];
      memState.locked  = false;
    }, 900);
  }
}

document.getElementById('mem-restart').addEventListener('click', () => {
  clearInterval(memState.timer);
  sfxClick();
  initMemory();
});
