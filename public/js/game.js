const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const orientationOverlay = document.getElementById('orientationOverlay');
const scoreValue = document.getElementById('scoreValue');
const livesValue = document.getElementById('livesValue');
const levelValue = document.getElementById('levelValue');
const bestValue = document.getElementById('bestValue');
const pauseButton = document.getElementById('pauseButton');
const restartButton = document.getElementById('restartButton');
const musicButton = document.getElementById('musicButton');
const volumeSlider = document.getElementById('volumeSlider');
const touchControls = document.getElementById('touchControls');

const GAME_W = 480;
const GAME_H = 720;
const MAX_LEVEL = 10;
const keys = { left: false, right: false, shoot: false };
const touch = { left: false, right: false, shoot: false };

let state = null;
let lastTime = 0;
let audioCtx = null;
let masterGain = null;
let musicTimer = null;
let musicIndex = 0;
let orientationBlocked = false;

function getLevelConfig(level) {
  const names = ['PRIMERA OLA', 'SEGUNDA OLA', 'VUELTA RÁPIDA', 'FUEGO CRUZADO', 'MINI JEFE', 'FORMACIÓN', 'RESISTENCIA', 'ATAQUE COORDINADO', 'OLEADA MIXTA', 'JEFE FINAL'];
  const summaries = ['La primera prueba.', 'El avance se endurece.', 'La flota acelera.', 'Llegan más disparos.', 'Un adversario mayor.', 'La formación cambia.', 'Los invasores resisten.', 'La defensa se pone a prueba.', 'La invasión se mezcla.', 'La última batalla.'];
  const difficultyBoost = Math.min(0.18, (level - 1) * 0.014);
  const bossLevel = level === 5 || level === 10;
  return {
    name: names[Math.min(level - 1, names.length - 1)],
    summary: summaries[Math.min(level - 1, summaries.length - 1)],
    rows: bossLevel ? 0 : 4 + Math.min(2, Math.floor((level - 1) / 2)),
    cols: bossLevel ? 0 : 6 + Math.min(2, level - 1),
    speed: 0.82 + difficultyBoost,
    bulletFrequency: 0.0038 + difficultyBoost * 0.004,
    scoreBase: 100 + level * 12,
    music: level === 10 ? [440, 587, 784, 1046] : level === 5 ? [277, 349, 440, 554] : [392, 440, 523, 587],
    palette: level === 10 ? ['#000000', '#161616', '#ff2d2d'] : level === 5 ? ['#000000', '#1a1113', '#ff5d8a'] : ['#000000', '#121812', '#00ff66'],
    bossHp: level === 10 ? 48 : Math.round(20 * (1 + (level - 1) * 0.6)),
    bossSpeed: 1 + (level - 1) * 0.2,
    bossCooldown: level === 10 ? 0.55 : 0.8
  };
}

function createState() {
  const initialLevel = getLevelConfig(1);
  return {
    phase: 'menu',
    paused: false,
    pendingPhase: 'menu',
    score: 0,
    bestScore: Number(localStorage.getItem('spaceInvadersBest') || 0),
    lives: 3,
    level: 1,
    wave: 1,
    levelData: initialLevel,
    player: { x: 220, y: 650, w: 24, h: 16, cooldown: 0, invulnerable: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    shields: [],
    particles: [],
    explosions: [],
    powerUps: [],
    stars: createStars(),
    ufo: null,
    ufoTimer: 0,
    enemyDirection: 1,
    enemySpeed: initialLevel.speed,
    activeBuff: null,
    activeBuffTimer: 0,
    rapidFire: 0,
    doubleShot: 0,
    shieldTimer: 0,
    scoreBonus: 0,
    scoreMultiplier: 1,
    scoreMultiplierTimer: 0,
    laserTimer: 0,
    tripleTimer: 0,
    missileTimer: 0,
    freezeTimer: 0,
    magnetTimer: 0,
    invulnerableTimer: 0,
    transitionTimer: 0,
    boss: null,
    frame: 0,
    enemyMoveTimer: 0,
    shotsFired: 0,
    shotsHit: 0,
    enemiesDestroyed: 0,
    startTime: Date.now(),
    elapsedTime: 0,
    volume: 0.5,
    muted: false,
    musicEnabled: true
  };
}

function init() {
  state = createState();
  fitGame();
  attachEvents();
  updateHud();
  showOverlay('menu');
  requestAnimationFrame(loop);
  updateOrientation();
  applyMobileScale();
}

function fitGame() {
  const panel = document.getElementById('uiPanel');
  const panelWidth = panel && window.getComputedStyle(panel).position === 'absolute' && window.innerWidth > 680 ? 260 : 0;
  const maxWidth = Math.max(280, window.innerWidth - panelWidth);
  const maxHeight = window.innerHeight;
  const scale = Math.min(1, Math.min(maxWidth / GAME_W, maxHeight / GAME_H));
  canvas.style.width = `${GAME_W * scale}px`;
  canvas.style.height = `${GAME_H * scale}px`;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(GAME_W * ratio);
  canvas.height = Math.round(GAME_H * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches || window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function applyMobileScale() {
  const shell = document.getElementById('gameShell');
  if (!shell) return;
  if (isMobile()) {
    shell.style.transform = 'scale(1.02)';
    shell.style.transformOrigin = 'center center';
  } else {
    shell.style.transform = 'scale(1)';
  }
}

function createStars() {
  return Array.from({ length: 90 }, () => ({
    x: Math.random() * GAME_W,
    y: Math.random() * GAME_H,
    speed: 0.2 + Math.random() * 0.6
  }));
}

function updateStars(delta) {
  if (!state) return;
  state.stars.forEach((star) => {
    star.y += star.speed * delta * 60;
    if (star.y > GAME_H) {
      star.y = -2;
      star.x = Math.random() * GAME_W;
    }
  });
}

function updateHud() {
  if (!state) return;
  scoreValue.textContent = state.score;
  livesValue.textContent = state.lives;
  levelValue.textContent = state.level;
  bestValue.textContent = state.bestScore;
}

function saveBestScore() {
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem('spaceInvadersBest', state.bestScore);
  }
  updateHud();
}

function getStatsSummary() {
  const precision = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  return { score: state.score, bestScore: state.bestScore, enemiesDestroyed: state.enemiesDestroyed, elapsed, precision };
}

function showOverlay(mode, extra = {}) {
  const title = overlay.querySelector('h2');
  const copy = overlay.querySelector('.overlay-copy');
  const actions = overlay.querySelector('.overlay-actions');
  if (mode === 'menu') {
    title.textContent = 'SPACE INVADERS REMASTERED';
    copy.textContent = 'Defiende la Tierra con una experiencia más fiel, pulida y lista para móvil y escritorio.';
    actions.innerHTML = '<button class="primary-btn" data-action="start" type="button">JUGAR</button><button class="secondary-btn" data-action="instructions" type="button">INSTRUCCIONES</button><button class="secondary-btn" data-action="credits" type="button">CRÉDITOS</button>';
  } else if (mode === 'instructions') {
    title.textContent = 'INSTRUCCIONES';
    copy.textContent = 'Mueve la nave con las flechas o A/D, dispara con espacio y aprovecha los power-ups para sobrevivir.';
    actions.innerHTML = '<button class="primary-btn" data-action="start" type="button">JUGAR</button>';
  } else if (mode === 'credits') {
    title.textContent = 'CRÉDITOS';
    copy.textContent = 'Taito Corporation - Space Invaders 1978';
    actions.innerHTML = '<button class="primary-btn" data-action="start" type="button">JUGAR</button>';
  } else if (mode === 'gameover') {
    title.textContent = 'DERROTA';
    copy.textContent = 'La invasión ha alcanzado la base. Prueba otra vez y recupera el control.';
    actions.innerHTML = '<button class="primary-btn" data-action="start" type="button">REINTENTAR</button><button class="secondary-btn" data-action="credits" type="button">CRÉDITOS</button>';
  } else if (mode === 'victory') {
    title.textContent = 'VICTORIA';
    copy.textContent = 'La flota ha sido repelida. Tu defensa se ha convertido en leyenda.';
    actions.innerHTML = '<button class="primary-btn" data-action="start" type="button">REINICIAR</button><button class="secondary-btn" data-action="credits" type="button">CRÉDITOS</button>';
  } else if (mode === 'paused') {
    title.textContent = 'PAUSA';
    copy.textContent = 'El juego está en pausa. Pulsa continuar cuando estés listo.';
    actions.innerHTML = '<button class="primary-btn" data-action="resume" type="button">CONTINUAR</button>';
  } else if (mode === 'transition') {
    title.textContent = 'NIVEL COMPLETADO';
    const stats = getStatsSummary();
    copy.innerHTML = `<strong>${extra.title || 'Nueva ofensiva'}</strong><br>${extra.text || 'El combate cambia de ritmo.'}<br><br>Puntos: ${stats.score}<br>Precisión: ${stats.precision}%<br>Enemigos: ${stats.enemiesDestroyed}<br>Bonificación: ${state.level * 50}`;
    actions.innerHTML = '<button class="primary-btn" data-action="continue" type="button">CONTINUAR</button>';
  } else if (mode === 'finale') {
    title.textContent = '¡HAS SALVADO LA GALAXIA!';
    const stats = getStatsSummary();
    copy.innerHTML = `Puntuación final: ${stats.score}<br>Récord: ${stats.bestScore}<br>Enemigos destruidos: ${stats.enemiesDestroyed}<br>Tiempo: ${stats.elapsed}s<br>Precisión: ${stats.precision}%`;
    actions.innerHTML = '<button class="primary-btn" data-action="start" type="button">JUGAR DE NUEVO</button>';
  }
  overlay.classList.add('visible');
  attachOverlayActions();
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function attachOverlayActions() {
  overlay.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'start') startGame();
      if (action === 'resume') resumeGame();
      if (action === 'continue') continueLevel();
      if (action === 'instructions') showOverlay('instructions');
      if (action === 'credits') showOverlay('credits');
    });
  });
}

function startGame() {
  state = createState();
  state.bestScore = Number(localStorage.getItem('spaceInvadersBest') || 0);
  state.volume = Number(volumeSlider.value) / 100;
  state.muted = false;
  state.musicEnabled = musicButton.textContent.includes('on');
  state.player.x = 220;
  state.player.y = 650;
  state.pendingPhase = 'playing';
  buildWave();
  buildShields();
  hideOverlay();
  updateHud();
  ensureAudio();
  playSound('start');
  state.phase = 'playing';
  state.paused = false;
  pauseButton.textContent = 'Pausar';
  resumeMusic();
}

function pauseGame() {
  if (state.phase !== 'playing') return;
  state.phase = 'paused';
  state.paused = true;
  state.pendingPhase = 'paused';
  pauseButton.textContent = 'Reanudar';
  showOverlay('paused');
  stopMusic();
}

function resumeGame() {
  if (orientationBlocked) {
    state.pendingPhase = 'playing';
    return;
  }
  state.phase = 'playing';
  state.paused = false;
  state.pendingPhase = 'playing';
  pauseButton.textContent = 'Pausar';
  hideOverlay();
  resumeMusic();
}

function togglePause() {
  if (!state) return;
  if (state.phase === 'playing') {
    pauseGame();
  } else if (state.phase === 'paused') {
    resumeGame();
  }
}

function buildWave() {
  state.levelData = getLevelConfig(state.level);
  state.enemies = [];
  state.boss = null;
  state.enemyDirection = 1;
  state.enemySpeed = state.levelData.speed;
  state.ufo = null;
  state.ufoTimer = 4 + Math.random() * 5;

  if (state.level === 5 || state.level === 10) {
    const bossHp = state.levelData.bossHp;
    state.boss = {
      x: 120,
      y: 92,
      w: 240,
      h: 46,
      hp: bossHp,
      maxHp: bossHp,
      phase: 1,
      cooldown: state.levelData.bossCooldown,
      patternTimer: 0,
      dir: 1,
      speed: state.levelData.bossSpeed,
      doubleShot: state.level >= 3,
      triplePattern: state.level >= 5
    };
    state.wave = state.level;
    return;
  }

  const rows = state.levelData.rows;
  const cols = state.levelData.cols;
  const spacingX = 34;
  const spacingY = 32;
  const startX = 40 + (GAME_W - (cols * spacingX - 4)) / 2;
  const startY = 96;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      state.enemies.push({ x: startX + col * spacingX, y: startY + row * spacingY, w: 24, h: 18, alive: true, row, variant: (row + state.level) % 3 });
    }
  }
}

function buildShields() {
  state.shields = [];
  for (let i = 0; i < 4; i += 1) {
    state.shields.push({ x: 68 + i * 94, y: 598, w: 42, h: 18, hp: 3 });
  }
}

function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  audioCtx = new AudioCtx();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = state.volume;
  masterGain.connect(audioCtx.destination);
}

function playSound(type) {
  if (!audioCtx || state.muted) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(masterGain);
  if (type === 'shoot') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.08);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  } else if (type === 'enemy') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(410, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.14);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  } else if (type === 'ufo') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.2);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  } else if (type === 'explosion') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  } else if (type === 'victory') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(660, now + 0.14);
    osc.frequency.linearRampToValueAtTime(880, now + 0.28);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
  } else if (type === 'start') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.1);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  }
  osc.start(now);
  osc.stop(now + 0.35);
}

function resumeMusic() {
  if (!state.musicEnabled || state.muted || !audioCtx) return;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = setInterval(() => {
    if (state.phase !== 'playing' || state.paused) return;
    const notes = state.levelData.music;
    playTone(notes[musicIndex % notes.length], 0.18, 'triangle', 0.008);
    musicIndex += 1;
  }, 420);
}

function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

function playTone(freq, duration, type, vol) {
  if (!audioCtx || state.muted) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function toggleMusic() {
  state.musicEnabled = !state.musicEnabled;
  musicButton.textContent = state.musicEnabled ? 'Música: on' : 'Música: off';
  if (state.musicEnabled && state.phase === 'playing' && !state.paused) resumeMusic(); else stopMusic();
}

function updateVolume(value) {
  state.volume = value / 100;
  if (masterGain) masterGain.gain.value = state.volume;
  volumeSlider.value = value;
}

function spawnExplosion(x, y, color = '#ffffff') {
  for (let i = 0; i < 5; i += 1) {
    state.explosions.push({ x, y, vx: (Math.random() - 0.5) * 2.2, vy: (Math.random() - 0.5) * 2.2, life: 0.45, color });
  }
}

function spawnParticles(x, y, color = '#ffffff') {
  for (let i = 0; i < 4; i += 1) {
    state.particles.push({ x, y, vx: (Math.random() - 0.5) * 1.8, vy: (Math.random() - 0.5) * 1.8, life: 0.45, color });
  }
}

function shootPlayer() {
  if (state.player.cooldown > 0) return;
  state.shotsFired += 1;
  const spread = state.tripleTimer > 0 ? 3 : (state.doubleShot > 0 ? 2 : 1);
  const offsets = state.tripleTimer > 0 ? [-10, 0, 10] : (state.doubleShot > 0 ? [-7, 7] : [0]);
  offsets.forEach((offset, index) => {
    const bullet = { x: state.player.x + state.player.w / 2 - 2 + offset, y: state.player.y - 8, w: state.laserTimer > 0 ? 6 : 4, h: state.laserTimer > 0 ? 16 : 12, speed: 520, vx: 0, vy: -1, pierce: state.laserTimer > 0 ? 2 : 0, missile: state.missileTimer > 0 && index === 1 };
    state.bullets.push(bullet);
  });
  state.player.cooldown = state.rapidFire > 0 ? 0.1 : 0.2;
  playSound('shoot');
}

function updatePlayer(delta) {
  const speed = 260;
  let move = 0;
  if ((keys.left || touch.left) && !(keys.right || touch.right)) move = -1;
  if ((keys.right || touch.right) && !(keys.left || touch.left)) move = 1;
  state.player.x += move * speed * delta;
  state.player.x = Math.max(8, Math.min(GAME_W - state.player.w - 8, state.player.x));
  if (state.player.cooldown > 0) state.player.cooldown -= delta;
  if (state.player.invulnerable > 0) state.player.invulnerable -= delta;
  if (state.activeBuffTimer > 0) {
    state.activeBuffTimer -= delta;
    if (state.activeBuffTimer <= 0) resetActiveBuff();
  }
  if (state.rapidFire > 0) state.rapidFire -= delta;
  if (state.doubleShot > 0) state.doubleShot -= delta;
  if (state.shieldTimer > 0) state.shieldTimer -= delta;
  if (state.scoreBonus > 0) state.scoreBonus -= delta;
  if (state.scoreMultiplierTimer > 0) {
    state.scoreMultiplierTimer -= delta;
  } else {
    state.scoreMultiplier = 1;
  }
  if (state.laserTimer > 0) state.laserTimer -= delta;
  if (state.tripleTimer > 0) state.tripleTimer -= delta;
  if (state.missileTimer > 0) state.missileTimer -= delta;
  if (state.freezeTimer > 0) state.freezeTimer -= delta;
  if (state.magnetTimer > 0) state.magnetTimer -= delta;
  if (state.invulnerableTimer > 0) state.invulnerableTimer -= delta;
  if (keys.shoot || touch.shoot) shootPlayer();
}

function updateBullets(delta) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.x += bullet.vx * bullet.speed * delta;
    bullet.y += bullet.vy * bullet.speed * delta;
    if (bullet.y < -20 || bullet.x < -20 || bullet.x > GAME_W + 20) state.bullets.splice(i, 1);
  }
  for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.enemyBullets[i];
    bullet.x += bullet.vx * bullet.speed * delta;
    bullet.y += bullet.vy * bullet.speed * delta;
    if (bullet.y > GAME_H + 20) state.enemyBullets.splice(i, 1);
  }
}

function updateEnemies(delta) {
  if (state.level === 5 || state.level === 10) {
    if (!state.boss) return;
    state.boss.x += state.boss.dir * 110 * delta * (state.boss.speed || 1);
    if (state.boss.x <= 40 || state.boss.x + state.boss.w >= GAME_W - 40) state.boss.dir *= -1;
    state.boss.cooldown -= delta;
    if (state.boss.cooldown <= 0) {
      fireBossPattern();
      state.boss.cooldown = state.levelData.bossCooldown;
    }
    if (state.boss.hp <= state.boss.maxHp * 0.66 && state.boss.phase < 2) {
      state.boss.phase = 2;
      state.boss.cooldown = 0.7;
    }
    if (state.boss.hp <= state.boss.maxHp * 0.33 && state.boss.phase < 3) {
      state.boss.phase = 3;
      state.boss.cooldown = 0.55;
    }
    return;
  }

  if (state.enemies.length === 0) {
    advanceLevel();
    return;
  }

  state.enemyMoveTimer += delta;
  if (state.enemyMoveTimer >= 0.038) {
    state.enemyMoveTimer = 0;
    const edge = state.enemies.some((enemy) => enemy.alive && (enemy.x <= 16 || enemy.x + enemy.w >= GAME_W - 16));
    if (edge) {
      state.enemyDirection *= -1;
      state.enemies.forEach((enemy) => { if (enemy.alive) enemy.y += 8; });
    }
    state.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      enemy.x += state.enemyDirection * Math.max(5, state.enemySpeed * 8);
      if (enemy.y + enemy.h >= state.player.y - 10) {
        gameOver();
      }
    });
  }
  state.enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const shieldHit = state.shields.find((shield) => shield.hp > 0 && enemy.x + enemy.w > shield.x && enemy.x < shield.x + shield.w && enemy.y < shield.y + shield.h && enemy.y + enemy.h > shield.y);
    if (shieldHit) {
      shieldHit.hp -= 1;
      enemy.alive = false;
      spawnExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ffffff');
      playSound('enemy');
    }
  });
  if (Math.random() < state.levelData.bulletFrequency * 3.2 + state.level * 0.001) {
    const shooters = state.enemies.filter((enemy) => enemy.alive);
    if (shooters.length) {
      const shooter = shooters[Math.floor(Math.random() * shooters.length)];
      state.enemyBullets.push({ x: shooter.x + shooter.w / 2 - 2, y: shooter.y + 8, w: 4, h: 12, speed: 210 + state.level * 16, vx: 0, vy: 1 });
    }
  }
  state.ufoTimer -= delta;
  if (state.ufoTimer <= 0 && !state.ufo) {
    state.ufo = { x: -40, y: 60, w: 40, h: 18, dir: 1, speed: 78, cooldown: (1.4 + Math.random() * 0.6) * 1.15 };
    playSound('ufo');
    state.ufoTimer = 8 + Math.random() * 7;
  }
  if (state.ufo) {
    state.ufo.x += state.ufo.speed * delta * state.ufo.dir;
    state.ufo.cooldown -= delta;
    if (state.ufo.cooldown <= 0) {
      state.enemyBullets.push({ x: state.ufo.x + state.ufo.w / 2 - 2, y: state.ufo.y + 18, w: 4, h: 10, speed: 190, vx: 0, vy: 1 });
      state.ufo.cooldown = (1.4 + Math.random() * 0.6) * 1.15;
    }
    if (state.ufo.x > GAME_W + 40) state.ufo = null;
  }
}

function fireBossPattern() {
  if (!state.boss) return;
  const baseX = state.boss.x + state.boss.w / 2;
  if (state.boss.phase === 1) {
    state.enemyBullets.push({ x: baseX - 2, y: state.boss.y + 32, w: 6, h: 14, speed: 220, vx: 0, vy: 1 });
  } else if (state.boss.triplePattern) {
    for (let i = 0; i < 5; i += 1) {
      const angle = -0.4 + i * 0.2;
      state.enemyBullets.push({ x: baseX - 2, y: state.boss.y + 28, w: 4, h: 10, speed: 220, vx: angle, vy: 1 });
    }
  } else if (state.boss.doubleShot || state.boss.phase >= 2) {
    [0, -0.28, 0.28].forEach((vx) => state.enemyBullets.push({ x: baseX - 2, y: state.boss.y + 28, w: 5, h: 12, speed: 220, vx, vy: 1 }));
  }
}

function updatePowerUps(delta) {
  for (let i = state.powerUps.length - 1; i >= 0; i -= 1) {
    const powerUp = state.powerUps[i];
    if (state.magnetTimer > 0) {
      const dx = (state.player.x + state.player.w / 2) - (powerUp.x + powerUp.w / 2);
      const dy = (state.player.y + state.player.h / 2) - (powerUp.y + powerUp.h / 2);
      const len = Math.hypot(dx, dy) || 1;
      powerUp.x += (dx / len) * 140 * delta;
      powerUp.y += (dy / len) * 140 * delta;
    } else {
      powerUp.y += powerUp.speed * delta;
    }
    if (powerUp.y > GAME_H + 20) state.powerUps.splice(i, 1);
    if (powerUp.x + powerUp.w > state.player.x && powerUp.x < state.player.x + state.player.w && powerUp.y + powerUp.h > state.player.y && powerUp.y < state.player.y + state.player.h) {
      applyPowerUp(powerUp.type);
      state.powerUps.splice(i, 1);
    }
  }
}

function resetActiveBuff() {
  if (!state) return;
  state.activeBuff = null;
  state.activeBuffTimer = 0;
  state.rapidFire = 0;
  state.doubleShot = 0;
  state.shieldTimer = 0;
  state.laserTimer = 0;
  state.tripleTimer = 0;
  state.missileTimer = 0;
  state.freezeTimer = 0;
  state.magnetTimer = 0;
  state.invulnerableTimer = 0;
  state.scoreMultiplier = 1;
  state.scoreMultiplierTimer = 0;
}

function setActiveBuff(type, duration) {
  if (!state) return;
  resetActiveBuff();
  state.activeBuff = type;
  state.activeBuffTimer = duration;
  if (type === 'rapid') state.rapidFire = duration;
  else if (type === 'double') state.doubleShot = duration;
  else if (type === 'shield') state.shieldTimer = duration;
  else if (type === 'triple') state.tripleTimer = duration;
  else if (type === 'laser') state.laserTimer = duration;
  else if (type === 'missile') state.missileTimer = duration;
  else if (type === 'freeze') state.freezeTimer = duration;
  else if (type === 'magnet') state.magnetTimer = duration;
  else if (type === 'invulnerable') state.invulnerableTimer = duration;
  else if (type === 'x2') { state.scoreMultiplier = 2; state.scoreMultiplierTimer = duration; }
  else if (type === 'x3') { state.scoreMultiplier = 3; state.scoreMultiplierTimer = duration; }
}

function getRandomBuffType() {
  const roll = Math.random();
  if (roll < 0.05) return 'life';
  if (roll < 0.35) return 'double';
  if (roll < 0.65) return 'rapid';
  return 'shield';
}

function applyPowerUp(type) {
  if (type === 'rapid') setActiveBuff('rapid', 7);
  else if (type === 'double') setActiveBuff('double', 8);
  else if (type === 'shield') setActiveBuff('shield', 6);
  else if (type === 'score') { state.score += 1000 * state.scoreMultiplier; state.scoreBonus = 3; }
  else if (type === 'life') state.lives += 1;
  else if (type === 'triple') setActiveBuff('triple', 8);
  else if (type === 'laser') setActiveBuff('laser', 8);
  else if (type === 'missile') setActiveBuff('missile', 8);
  else if (type === 'freeze') setActiveBuff('freeze', 6);
  else if (type === 'magnet') setActiveBuff('magnet', 8);
  else if (type === 'x2') setActiveBuff('x2', 8);
  else if (type === 'x3') setActiveBuff('x3', 10);
  else if (type === 'emp') { destroyNearbyEnemies(); }
  else if (type === 'repair') { state.shields.forEach((shield) => { if (shield.hp < 3) shield.hp = Math.min(3, shield.hp + 1); }); }
  else if (type === 'invulnerable') setActiveBuff('invulnerable', 2.2);
  playSound('enemy');
  spawnParticles(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, '#86f7ff');
}

function destroyNearbyEnemies() {
  const radius = 48;
  state.enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const dx = (enemy.x + enemy.w / 2) - (state.player.x + state.player.w / 2);
    const dy = (enemy.y + enemy.h / 2) - (state.player.y + state.player.h / 2);
    if (Math.hypot(dx, dy) < radius) {
      enemy.alive = false;
      spawnExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ffcf57');
      state.score += 120 * state.scoreMultiplier;
    }
  });
  if (state.boss) {
    state.boss.hp = Math.max(0, state.boss.hp - 4);
    spawnExplosion(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h / 2, '#ff6f8f');
  }
  saveBestScore();
}

function updateShields() {
  state.shields.forEach((shield) => {
    if (shield.hp <= 0) return;
    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.enemyBullets[i];
      if (bullet.x + bullet.w > shield.x && bullet.x < shield.x + shield.w && bullet.y + bullet.h > shield.y && bullet.y < shield.y + shield.h) {
        shield.hp -= 1;
        state.enemyBullets.splice(i, 1);
        spawnParticles(shield.x + shield.w / 2, shield.y + shield.h / 2, '#ff6f8f');
      }
    }
  });
}

function awardEnemyKill(enemy, bullet) {
  if (!enemy.alive) return;
  enemy.alive = false;
  state.shotsHit += 1;
  state.enemiesDestroyed += 1;
  const baseScore = state.levelData.scoreBase + (state.level - 1) * 20;
  state.score += Math.round(baseScore * state.scoreMultiplier) + (state.scoreBonus > 0 ? 50 : 0);
  saveBestScore();
  spawnExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ffcf57');
  spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#86f7ff');
  if (Math.random() < 0.15) {
    state.powerUps.push({ x: enemy.x + enemy.w / 2 - 8, y: enemy.y + enemy.h / 2, w: 10, h: 10, speed: 96 + state.level * 6, type: getRandomBuffType() });
  }
  playSound('explosion');
}

function checkCollisions() {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    if (state.boss) {
      const hitBoss = bullet.x + bullet.w > state.boss.x && bullet.x < state.boss.x + state.boss.w && bullet.y + bullet.h > state.boss.y && bullet.y < state.boss.y + state.boss.h;
      if (hitBoss) {
        state.boss.hp -= bullet.missile ? 3 : 1;
        state.score += 60 * state.scoreMultiplier;
        saveBestScore();
        spawnExplosion(bullet.x, bullet.y, '#ff6f8f');
        if (bullet.missile) {
          state.bullets.splice(i, 1);
          break;
        }
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
          if (bullet.pierce <= 0) state.bullets.splice(i, 1);
        } else {
          state.bullets.splice(i, 1);
        }
        if (state.boss.hp <= 0) {
          state.boss = null;
          state.score += 1500 * state.scoreMultiplier;
          saveBestScore();
          spawnExplosion(state.boss ? state.boss.x : GAME_W / 2, state.boss ? state.boss.y : GAME_H / 2, '#ffcf57');
          advanceLevel();
        }
        continue;
      }
    }
    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (!enemy.alive) continue;
      const hit = bullet.x + bullet.w > enemy.x && bullet.x < enemy.x + enemy.w && bullet.y + bullet.h > enemy.y && bullet.y < enemy.y + enemy.h;
      if (hit) {
        if (bullet.missile) {
          awardEnemyKill(enemy, bullet);
          state.bullets.splice(i, 1);
          break;
        }
        awardEnemyKill(enemy, bullet);
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
          if (bullet.pierce <= 0) state.bullets.splice(i, 1);
        } else {
          state.bullets.splice(i, 1);
        }
        break;
      }
    }
    if (state.ufo && state.ufo.x >= 0) {
      const hitUfo = bullet.x + bullet.w > state.ufo.x && bullet.x < state.ufo.x + state.ufo.w && bullet.y + bullet.h > state.ufo.y && bullet.y < state.ufo.y + state.ufo.h;
      if (hitUfo) {
        state.bullets.splice(i, 1);
        state.score += 500 * state.scoreMultiplier;
        saveBestScore();
        spawnExplosion(state.ufo.x + state.ufo.w / 2, state.ufo.y + state.ufo.h / 2, '#ff6f8f');
        state.ufo = null;
        playSound('ufo');
      }
    }
  }
  for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.enemyBullets[i];
    const hitShield = state.shields.some((shield) => shield.hp > 0 && bullet.x + bullet.w > shield.x && bullet.x < shield.x + shield.w && bullet.y + bullet.h > shield.y && bullet.y < shield.y + shield.h);
    if (hitShield) {
      state.enemyBullets.splice(i, 1);
      continue;
    }
    const hitPlayer = bullet.x + bullet.w > state.player.x && bullet.x < state.player.x + state.player.w && bullet.y + bullet.h > state.player.y && bullet.y < state.player.y + state.player.h;
    if (hitPlayer && state.player.invulnerable <= 0 && state.invulnerableTimer <= 0) {
      state.enemyBullets.splice(i, 1);
      state.player.invulnerable = 1.4;
      state.lives -= 1;
      updateHud();
      spawnExplosion(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, '#ff6f8f');
      playSound('explosion');
      if (state.lives <= 0) gameOver();
      break;
    }
  }
  if (!state.boss && state.enemies.every((enemy) => !enemy.alive)) {
    advanceLevel();
  }
}

function gameOver() {
  stopMusic();
  saveBestScore();
  state.phase = 'gameover';
  state.paused = true;
  state.pendingPhase = 'gameover';
  showOverlay('gameover');
  playSound('victory');
}

function victory() {
  stopMusic();
  saveBestScore();
  state.phase = 'victory';
  state.paused = true;
  state.pendingPhase = 'victory';
  showOverlay('finale', getStatsSummary());
  playSound('victory');
}

function continueLevel() {
  hideOverlay();
  resetActiveBuff();
  buildWave();
  buildShields();
  state.phase = 'playing';
  state.paused = false;
  state.pendingPhase = 'playing';
  pauseButton.textContent = 'Pausar';
  updateHud();
  resumeMusic();
}

function advanceLevel() {
  if (state.level >= MAX_LEVEL) {
    victory();
    return;
  }
  state.level += 1;
  state.wave = state.level;
  state.phase = 'transition';
  state.paused = true;
  resetActiveBuff();
  const nextConfig = getLevelConfig(state.level);
  state.levelData = nextConfig;
  showOverlay('transition', { level: state.level, title: nextConfig.name, text: nextConfig.summary });
  updateHud();
  state.bullets = [];
  state.enemyBullets = [];
  state.powerUps = [];
  state.particles = [];
  state.explosions = [];
  state.ufo = null;
  state.boss = null;
  state.player.x = GAME_W / 2 - state.player.w / 2;
  state.player.y = 650;
  state.player.cooldown = 0;
}

function updateParticles(delta) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    state.particles[i].x += state.particles[i].vx * 60 * delta;
    state.particles[i].y += state.particles[i].vy * 60 * delta;
    state.particles[i].life -= delta;
    if (state.particles[i].life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.explosions.length - 1; i >= 0; i -= 1) {
    state.explosions[i].x += state.explosions[i].vx * 60 * delta;
    state.explosions[i].y += state.explosions[i].vy * 60 * delta;
    state.explosions[i].life -= delta;
    if (state.explosions[i].life <= 0) state.explosions.splice(i, 1);
  }
}

function update(delta) {
  if (!state) return;
  if (state.phase !== 'playing' || state.paused) return;
  state.frame += delta;
  state.elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
  updateStars(delta);
  updatePlayer(delta);
  updateBullets(delta);
  updateEnemies(delta);
  updatePowerUps(delta);
  updateShields();
  checkCollisions();
  updateParticles(delta);
  updateHud();
}

function drawBackground() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.fillStyle = '#ffffff';
  state.stars.forEach((star) => {
    ctx.fillRect(star.x, star.y, 1, 1);
  });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 620, GAME_W, 2);
}

function drawPlayer() {
  const { x, y, w, h } = state.player;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 8, y + 10, w - 16, 4);
  ctx.fillRect(x + 6, y + 14, w - 12, 4);
  ctx.fillRect(x + 10, y + 2, 4, 8);
  ctx.fillRect(x + 9, y + 6, 6, 4);
  ctx.fillRect(x + 4, y + 12, 4, 4);
  ctx.fillRect(x + 16, y + 12, 4, 4);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(x + 10, y + 4, 4, 4);
}

function drawEnemies() {
  const frame = Math.floor(state.frame * 4) % 2;
  state.enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const palette = enemy.variant === 0 ? ['#00ff00', '#ffffff'] : enemy.variant === 1 ? ['#00ff00', '#ffffff'] : ['#ff3333', '#ffffff'];
    ctx.fillStyle = palette[0];
    ctx.fillRect(enemy.x + 6, enemy.y + 4 + (frame ? 1 : 0), 12, 4);
    ctx.fillRect(enemy.x + 2, enemy.y + 8 + (frame ? 1 : 0), 20, 4);
    ctx.fillRect(enemy.x + 8, enemy.y + (frame ? 1 : 0), 8, 4);
    ctx.fillStyle = palette[1];
    ctx.fillRect(enemy.x + 8, enemy.y + 4 + (frame ? 1 : 0), 8, 4);
    ctx.fillRect(enemy.x + 4, enemy.y + 8 + (frame ? 1 : 0), 16, 4);
  });
  if (state.boss) {
    const boss = state.boss;
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(boss.x + 24, boss.y + 6, boss.w - 48, 8);
    ctx.fillRect(boss.x + 8, boss.y + 14, boss.w - 16, 10);
    ctx.fillRect(boss.x + 40, boss.y + 24, boss.w - 80, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boss.x + 70, boss.y + 12, 20, 8);
    ctx.fillRect(boss.x + 150, boss.y + 12, 20, 8);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(boss.x + 12, boss.y + 20, 20, 6);
    ctx.fillRect(boss.x + 208, boss.y + 20, 20, 6);
  }
}

function drawBullets() {
  ctx.fillStyle = '#ffffff';
  state.bullets.forEach((bullet) => ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h));
  ctx.fillStyle = '#ff3333';
  state.enemyBullets.forEach((bullet) => ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h));
}

function drawShields() {
  state.shields.forEach((shield) => {
    if (shield.hp <= 0) return;
    ctx.fillStyle = shield.hp > 4 ? '#ffffff' : '#c7c7c7';
    ctx.fillRect(shield.x, shield.y, shield.w, shield.h);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(shield.x + 8, shield.y + 6, shield.w - 16, 4);
  });
}

function drawPowerUps() {
  state.powerUps.forEach((powerUp) => {
    const color = powerUp.type === 'rapid' || powerUp.type === 'shield' ? '#00ff00' : powerUp.type === 'double' ? '#ffff66' : '#ffffff';
    ctx.fillStyle = color;
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.w, powerUp.h);
  });
}

function drawUfo() {
  if (!state.ufo) return;
  ctx.fillStyle = '#ffff66';
  ctx.fillRect(state.ufo.x + 4, state.ufo.y + 6, state.ufo.w - 8, 4);
  ctx.fillRect(state.ufo.x + 8, state.ufo.y + 2, state.ufo.w - 16, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(state.ufo.x + 10, state.ufo.y + 4, 6, 4);
  ctx.fillRect(state.ufo.x + 24, state.ufo.y + 4, 6, 4);
}

function drawParticles() {
  state.particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillRect(particle.x, particle.y, 2, 2);
  });
  state.explosions.forEach((explosion) => {
    ctx.fillStyle = explosion.color;
    ctx.globalAlpha = Math.max(0, explosion.life);
    ctx.fillRect(explosion.x, explosion.y, 3, 3);
  });
  ctx.globalAlpha = 1;
}

function drawHud() {
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText(`PUNTOS ${state.score}`, 10, 20);
  ctx.fillText(`RÉCORD ${state.bestScore}`, 250, 20);
  ctx.fillText(`VIDAS ${state.lives}`, 10, 38);
  ctx.fillText(`NIVEL ${state.level}`, 250, 38);
  if (state.activeBuff) ctx.fillText(state.activeBuff.toUpperCase(), 10, 680);
}

function draw() {
  drawBackground();
  drawShields();
  drawEnemies();
  drawUfo();
  drawBullets();
  drawPowerUps();
  drawPlayer();
  drawParticles();
  drawHud();
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = Math.min(0.032, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function updateOrientation() {
  const portrait = window.matchMedia('(orientation: portrait)').matches || window.innerHeight > window.innerWidth;
  const touchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (touchDevice && !portrait) {
    orientationBlocked = true;
    orientationOverlay.classList.add('visible');
    if (state && (state.phase === 'playing' || state.phase === 'paused')) {
      state.pendingPhase = state.phase === 'playing' ? 'playing' : 'paused';
      state.phase = 'orientation_blocked';
      state.paused = true;
      stopMusic();
    }
  } else {
    orientationBlocked = false;
    orientationOverlay.classList.remove('visible');
    if (state) {
      if (state.pendingPhase === 'playing') {
        state.phase = 'playing';
        state.paused = false;
        pauseButton.textContent = 'Pausar';
        hideOverlay();
        resumeMusic();
      } else if (state.pendingPhase === 'paused') {
        state.phase = 'paused';
        state.paused = true;
        pauseButton.textContent = 'Reanudar';
        showOverlay('paused');
        stopMusic();
      }
    }
  }
  touchControls.style.display = touchDevice && portrait ? 'flex' : 'none';
}

function handleInput(event) {
  if (event.type === 'touchend' || event.type === 'touchcancel') {
    touch.left = false;
    touch.right = false;
    touch.shoot = false;
    return;
  }
  const target = event.target;
  if (target && target.closest && target.closest('[data-control]')) return;
  if (event.touches && event.touches.length) {
    const { clientX, clientY } = event.touches[0];
    const halfWidth = window.innerWidth / 2;
    const isBottom = clientY > window.innerHeight * 0.7;
    touch.left = clientX < halfWidth - 24 && !isBottom;
    touch.right = clientX >= halfWidth + 24 && !isBottom;
    touch.shoot = false;
  }
}

function attachEvents() {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true;
    if (event.key === ' ' || event.key === 'Spacebar') { event.preventDefault(); keys.shoot = true; }
    if (event.key === 'p' || event.key === 'P') togglePause();
    if (event.key === 'Enter' && state.phase !== 'playing' && state.phase !== 'transition') startGame();
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false;
    if (event.key === ' ' || event.key === 'Spacebar') keys.shoot = false;
  });

  pauseButton.addEventListener('click', () => {
    ensureAudio();
    togglePause();
  });
  restartButton.addEventListener('click', () => {
    ensureAudio();
    startGame();
  });
  musicButton.addEventListener('click', () => {
    ensureAudio();
    toggleMusic();
  });
  volumeSlider.addEventListener('input', (event) => {
    ensureAudio();
    updateVolume(Number(event.target.value));
  });

  document.querySelectorAll('[data-control]').forEach((button) => {
    const control = button.dataset.control;
    const press = () => { ensureAudio(); if (control === 'left') touch.left = true; if (control === 'right') touch.right = true; if (control === 'shoot') touch.shoot = true; };
    const release = () => { if (control === 'left') touch.left = false; if (control === 'right') touch.right = false; if (control === 'shoot') touch.shoot = false; };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('touchstart', press, { passive: false });
    button.addEventListener('touchend', release);
    button.addEventListener('touchcancel', release);
    button.addEventListener('mousedown', press);
    button.addEventListener('mouseup', release);
  });

  window.addEventListener('touchstart', handleInput, { passive: true });
  window.addEventListener('touchmove', handleInput, { passive: true });
  window.addEventListener('touchend', handleInput);
  window.addEventListener('touchcancel', handleInput);
  window.addEventListener('resize', () => { fitGame(); updateOrientation(); applyMobileScale(); });
  window.addEventListener('orientationchange', () => { fitGame(); updateOrientation(); applyMobileScale(); });
  window.addEventListener('load', applyMobileScale);
  ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => window.addEventListener(eventName, ensureAudio, { once: true }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
