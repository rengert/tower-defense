const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  gold: document.getElementById('gold'),
  lives: document.getElementById('lives'),
  wave: document.getElementById('wave'),
  score: document.getElementById('score'),
  status: document.getElementById('status'),
  startWave: document.getElementById('startWave'),
};

const tileSize = 64;
const path = [
  { x: -20, y: 224 },
  { x: 160, y: 224 },
  { x: 160, y: 96 },
  { x: 352, y: 96 },
  { x: 352, y: 352 },
  { x: 576, y: 352 },
  { x: 576, y: 160 },
  { x: 820, y: 160 },
];

const state = {
  gold: 150,
  lives: 20,
  wave: 0,
  score: 0,
  enemiesToSpawn: 0,
  spawnCooldown: 0,
  enemies: [],
  towers: [],
  projectiles: [],
  gameOver: false,
  waveActive: false,
  lastTime: 0,
};

const towerCost = 50;
const towerTemplate = {
  range: 95,
  fireRate: 0.5,
  damage: 20,
};

function updateUi(message) {
  ui.gold.textContent = state.gold;
  ui.lives.textContent = state.lives;
  ui.wave.textContent = state.wave;
  ui.score.textContent = state.score;
  if (message) {
    ui.status.textContent = message;
  }
  ui.startWave.disabled = state.gameOver || state.waveActive;
}

function pointOnPath(x, y) {
  const margin = 28;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const minX = Math.min(a.x, b.x) - margin;
    const maxX = Math.max(a.x, b.x) + margin;
    const minY = Math.min(a.y, b.y) - margin;
    const maxY = Math.max(a.y, b.y) + margin;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return true;
    }
  }
  return false;
}

function startWave() {
  if (state.waveActive || state.gameOver) return;
  state.wave += 1;
  state.enemiesToSpawn = 6 + state.wave * 3;
  state.spawnCooldown = 0.6;
  state.waveActive = true;
  updateUi(`Welle ${state.wave} gestartet!`);
}

function spawnEnemy() {
  const hp = 50 + state.wave * 12;
  const speed = 44 + state.wave * 2.5;
  state.enemies.push({
    x: path[0].x,
    y: path[0].y,
    hp,
    maxHp: hp,
    speed,
    waypoint: 1,
  });
}

function updateEnemies(dt) {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    const target = path[e.waypoint];
    if (!target) {
      state.enemies.splice(i, 1);
      state.lives -= 1;
      if (state.lives <= 0) {
        state.gameOver = true;
        state.waveActive = false;
        updateUi('Game Over! Seite neu laden zum Neustart.');
      }
      continue;
    }

    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);
    const step = e.speed * dt;

    if (dist <= step) {
      e.x = target.x;
      e.y = target.y;
      e.waypoint += 1;
    } else {
      e.x += (dx / dist) * step;
      e.y += (dy / dist) * step;
    }
  }
}

function updateTowers(dt) {
  state.towers.forEach((tower) => {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) return;

    let nearest = null;
    let nearestDist = tower.range;

    state.enemies.forEach((e) => {
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d < nearestDist) {
        nearest = e;
        nearestDist = d;
      }
    });

    if (nearest) {
      tower.cooldown = tower.fireRate;
      state.projectiles.push({
        x: tower.x,
        y: tower.y,
        target: nearest,
        speed: 380,
        damage: tower.damage,
      });
    }
  });
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i];
    if (!state.enemies.includes(p.target)) {
      state.projectiles.splice(i, 1);
      continue;
    }

    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;

    if (dist <= step) {
      p.target.hp -= p.damage;
      state.projectiles.splice(i, 1);
    } else {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    }
  }
}

function removeDeadEnemies() {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    if (state.enemies[i].hp <= 0) {
      state.enemies.splice(i, 1);
      state.gold += 12;
      state.score += 10;
    }
  }
}

function updateSpawning(dt) {
  if (!state.waveActive || state.gameOver) return;

  if (state.enemiesToSpawn > 0) {
    state.spawnCooldown -= dt;
    if (state.spawnCooldown <= 0) {
      spawnEnemy();
      state.enemiesToSpawn -= 1;
      state.spawnCooldown = Math.max(0.25, 0.75 - state.wave * 0.03);
    }
  }

  if (state.enemiesToSpawn === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    state.gold += 40;
    updateUi(`Welle ${state.wave} geschafft! Bonus +40 Gold.`);
  }
}

function drawPath() {
  ctx.lineWidth = 52;
  ctx.strokeStyle = '#8f7752';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i += 1) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let x = 0; x <= canvas.width; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawTowers() {
  state.towers.forEach((tower) => {
    ctx.fillStyle = '#8fc7ff';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#203548';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 7, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEnemies() {
  state.enemies.forEach((e) => {
    ctx.fillStyle = '#e86d6d';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 14, 0, Math.PI * 2);
    ctx.fill();

    const barW = 28;
    ctx.fillStyle = '#2f2f2f';
    ctx.fillRect(e.x - barW / 2, e.y - 24, barW, 5);
    ctx.fillStyle = '#61f09d';
    ctx.fillRect(e.x - barW / 2, e.y - 24, barW * Math.max(0, e.hp / e.maxHp), 5);
  });
}

function drawProjectiles() {
  ctx.fillStyle = '#ffe28b';
  state.projectiles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2e5f2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPath();
  drawGrid();
  drawTowers();
  drawEnemies();
  drawProjectiles();
}

function gameLoop(timestamp) {
  const dt = Math.min(0.033, (timestamp - state.lastTime) / 1000 || 0);
  state.lastTime = timestamp;

  if (!state.gameOver) {
    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    removeDeadEnemies();
    updateUi();
  }

  render();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', (event) => {
  if (state.gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

  const gridX = Math.floor(x / tileSize) * tileSize + tileSize / 2;
  const gridY = Math.floor(y / tileSize) * tileSize + tileSize / 2;

  const occupied = state.towers.some((t) => Math.hypot(t.x - gridX, t.y - gridY) < 8);
  if (occupied) {
    updateUi('Hier steht bereits ein Turm.');
    return;
  }

  if (pointOnPath(gridX, gridY)) {
    updateUi('Du kannst keinen Turm auf den Weg setzen.');
    return;
  }

  if (state.gold < towerCost) {
    updateUi('Nicht genug Gold.');
    return;
  }

  state.gold -= towerCost;
  state.towers.push({
    x: gridX,
    y: gridY,
    range: towerTemplate.range,
    fireRate: towerTemplate.fireRate,
    damage: towerTemplate.damage,
    cooldown: 0.1,
  });
  updateUi('Turm gebaut!');
});

ui.startWave.addEventListener('click', startWave);
updateUi('Bereit! Baue Türme und starte die erste Welle.');
requestAnimationFrame(gameLoop);
