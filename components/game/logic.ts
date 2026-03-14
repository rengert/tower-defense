import {
  ENEMY_BASE_HEALTH,
  ENEMY_GOLD_REWARD,
  ENEMY_HEALTH_SCALE_PER_WAVE,
  ENEMY_SPEED_PER_TICK,
  ENEMIES_PER_WAVE,
  GRID_COLS,
  PATH_ROW,
  SPAWN_INTERVAL_MS,
  STARTING_GOLD,
  STARTING_LIVES,
  TICK_MS,
  TOTAL_WAVES,
  TOWER_COOLDOWN_MS,
  TOWER_COST,
  TOWER_DAMAGE,
  TOWER_RANGE,
  WAVE_BREAK_MS,
} from './constants';
import type { Enemy, GameState, Tower } from './types';

export function createInitialState(): GameState {
  return {
    enemies: [],
    towers: [],
    gold: STARTING_GOLD,
    lives: STARTING_LIVES,
    wave: 1,
    status: 'playing',
    enemiesSpawned: 0,
    enemiesKilled: 0,
    elapsedMs: 0,
    // Offset so the first enemy spawns on the very first eligible tick.
    lastSpawnMs: -SPAWN_INTERVAL_MS,
    nextEnemyId: 1,
    nextTowerId: 1,
  };
}

/** Pure function: advance game state by one TICK_MS step. */
export function tickGame(prev: GameState): GameState {
  if (prev.status !== 'playing') return prev;

  let enemies: Enemy[] = [...prev.enemies];
  let towers: Tower[] = [...prev.towers];
  let {
    gold,
    lives,
    wave,
    status,
    enemiesSpawned,
    enemiesKilled,
    elapsedMs,
    lastSpawnMs,
    nextEnemyId,
    nextTowerId,
  } = prev;

  elapsedMs += TICK_MS;

  // ── Spawn ────────────────────────────────────────────────────────────────
  const totalThisWave = wave * ENEMIES_PER_WAVE;
  if (
    enemiesSpawned < totalThisWave &&
    elapsedMs - lastSpawnMs >= SPAWN_INTERVAL_MS
  ) {
    const health = ENEMY_BASE_HEALTH + (wave - 1) * ENEMY_HEALTH_SCALE_PER_WAVE;
    enemies = [
      ...enemies,
      { id: nextEnemyId++, col: -1, health, maxHealth: health },
    ];
    enemiesSpawned++;
    lastSpawnMs = elapsedMs;
  }

  // ── Move enemies ─────────────────────────────────────────────────────────
  enemies = enemies.map((e) => ({ ...e, col: e.col + ENEMY_SPEED_PER_TICK }));

  // ── Enemies reaching the exit ─────────────────────────────────────────────
  let livesLost = 0;
  enemies = enemies.filter((e) => {
    if (e.col >= GRID_COLS) {
      livesLost++;
      return false;
    }
    return true;
  });
  lives = Math.max(0, lives - livesLost);

  // ── Tower attacks ─────────────────────────────────────────────────────────
  let mutableEnemies = [...enemies];
  let goldEarned = 0;

  towers = towers.map((tower): Tower => {
    const remainingCooldown = tower.cooldownMs - TICK_MS;
    if (remainingCooldown > 0) {
      return { ...tower, cooldownMs: remainingCooldown };
    }

    // Find the closest enemy in range
    let target: Enemy | null = null;
    let minDist = Infinity;
    for (const enemy of mutableEnemies) {
      const dist = Math.sqrt(
        (enemy.col - tower.col) ** 2 + (PATH_ROW - tower.row) ** 2
      );
      if (dist <= TOWER_RANGE && dist < minDist) {
        minDist = dist;
        target = enemy;
      }
    }

    if (target !== null) {
      const targetId = target.id;
      mutableEnemies = mutableEnemies.map((e) =>
        e.id === targetId ? { ...e, health: e.health - TOWER_DAMAGE } : e
      );
      return { ...tower, cooldownMs: TOWER_COOLDOWN_MS };
    }

    return { ...tower, cooldownMs: 0 };
  });

  // ── Remove dead enemies ───────────────────────────────────────────────────
  enemies = mutableEnemies.filter((e) => {
    if (e.health <= 0) {
      goldEarned += ENEMY_GOLD_REWARD;
      enemiesKilled++;
      return false;
    }
    return true;
  });
  gold += goldEarned;

  // ── Wave transition ───────────────────────────────────────────────────────
  const waveComplete =
    enemiesSpawned >= totalThisWave && enemies.length === 0;

  if (waveComplete) {
    if (wave >= TOTAL_WAVES) {
      status = 'won';
    } else {
      wave++;
      enemiesSpawned = 0;
      // Delay the first spawn of the new wave by WAVE_BREAK_MS
      lastSpawnMs = elapsedMs + WAVE_BREAK_MS - SPAWN_INTERVAL_MS;
    }
  }

  // ── Lose condition ────────────────────────────────────────────────────────
  if (lives <= 0) {
    status = 'lost';
  }

  return {
    enemies,
    towers,
    gold,
    lives,
    wave,
    status,
    enemiesSpawned,
    enemiesKilled,
    elapsedMs,
    lastSpawnMs,
    nextEnemyId,
    nextTowerId,
  };
}

/** Returns true when a tower can legally be placed at (row, col). */
export function canPlaceTower(
  state: GameState,
  row: number,
  col: number
): boolean {
  if (row === PATH_ROW) return false;
  if (state.gold < TOWER_COST) return false;
  if (state.towers.some((t) => t.row === row && t.col === col)) return false;
  return true;
}

/** Returns a new state with the tower placed (or the same state if invalid). */
export function placeTower(
  state: GameState,
  row: number,
  col: number
): GameState {
  if (!canPlaceTower(state, row, col)) return state;
  return {
    ...state,
    towers: [
      ...state.towers,
      { id: state.nextTowerId, row, col, cooldownMs: 0 },
    ],
    gold: state.gold - TOWER_COST,
    nextTowerId: state.nextTowerId + 1,
  };
}
