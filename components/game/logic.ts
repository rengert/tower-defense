import {
  AIR_ROW,
  ENEMY_AIR_SPEED,
  ENEMY_BASE_HEALTH,
  ENEMY_GOLD_REWARD,
  ENEMY_HEALTH_SCALE_PER_WAVE,
  ENEMY_SPEED,
  ENEMIES_PER_WAVE,
  GRID_COLS,
  GRID_ROWS,
  PATH_ROW,
  SPAWN_INTERVAL_MS,
  STARTING_GOLD,
  STARTING_LIVES,
  TICK_MS,
  TOTAL_WAVES,
  PROJECTILE_TTL_MS,
  TOWER_STATS,
  type TowerStats,
  WAVE_BREAK_MS,
} from './constants';
import type { EnemyCategory, EnemyType, Enemy, GameState, Tower, TowerType } from './types';

/** A cell coordinate on the game grid. */
export type GridPoint = { row: number; col: number };

export interface LevelDifficulty {
  level: number;
  enemyHealthMultiplier: number;
  groundSpeedMultiplier: number;
  airSpeedMultiplier: number;
  spawnIntervalMs: number;
  enemiesPerWave: number;
  totalWaves: number;
  waveBreakMs: number;
}

/** Returns dynamic difficulty parameters for a level. */
export function getLevelDifficulty(level: number): LevelDifficulty {
  const safeLevel = Math.max(1, Math.floor(level));
  return {
    level: safeLevel,
    enemyHealthMultiplier: 1 + (safeLevel - 1) * 0.18,
    groundSpeedMultiplier: 1 + (safeLevel - 1) * 0.045,
    airSpeedMultiplier: 1 + (safeLevel - 1) * 0.055,
    spawnIntervalMs: Math.max(900, SPAWN_INTERVAL_MS - (safeLevel - 1) * 60),
    enemiesPerWave: ENEMIES_PER_WAVE + Math.floor((safeLevel - 1) / 2),
    totalWaves: TOTAL_WAVES + Math.floor((safeLevel - 1) / 3),
    waveBreakMs: Math.max(1200, WAVE_BREAK_MS - (safeLevel - 1) * 120),
  };
}

function resolveTowerStats(
  towerStatsOverride?: Record<TowerType, TowerStats>
): Record<TowerType, TowerStats> {
  return towerStatsOverride ?? TOWER_STATS;
}

// ── Wave configuration ──────────────────────────────────────────────────────
type EnemySpec = { enemyType: EnemyType; category: EnemyCategory };

/**
 * Returns which enemy to spawn for a given wave and spawn index.
 * Wave 1: all ground (goblin).
 * Wave 2: alternating ground (orc) / air (harpy).
 * Wave 3: alternating ground (skeleton) / air (wyvern).
 */
function getEnemySpec(wave: number, spawnIndex: number): EnemySpec {
  switch (wave) {
    case 1: return { enemyType: 'goblin', category: 'ground' };
    case 2: return spawnIndex % 2 === 0
      ? { enemyType: 'orc',   category: 'ground' }
      : { enemyType: 'harpy', category: 'air' };
    case 3: return spawnIndex % 2 === 0
      ? { enemyType: 'skeleton', category: 'ground' }
      : { enemyType: 'wyvern',   category: 'air' };
    default: return { enemyType: 'goblin', category: 'ground' };
  }
}

/** Off-screen column where enemies spawn (to the left of the grid). */
const ENEMY_SPAWN_COLUMN = -1;

/** Sentinel ID used for hypothetical towers during path validation. */
const HYPOTHETICAL_TOWER_ID = -1;

/** Traversal order: right first so the default path goes straight along PATH_ROW. */
const NEIGHBOR_DIRECTIONS: readonly (readonly [number, number])[] = [
  [0, 1],   // right
  [0, -1],  // left
  [-1, 0],  // up
  [1, 0],   // down
];

/**
 * Finds the shortest path for ground enemies from (PATH_ROW, 0) to
 * (PATH_ROW, GRID_COLS-1), avoiding cells occupied by towers.
 * Returns an array of grid cells, or null if no path exists.
 */
export function findShortestPath(towers: Tower[]): GridPoint[] | null {
  const blocked = new Set(towers.map((tower) => `${tower.row},${tower.col}`));

  const startRow = PATH_ROW;
  const startCol = 0;
  const endRow = PATH_ROW;
  const endCol = GRID_COLS - 1;

  if (blocked.has(`${startRow},${startCol}`) || blocked.has(`${endRow},${endCol}`)) {
    return null;
  }

  type PathNode = { row: number; col: number; parent: PathNode | null };
  const start: PathNode = { row: startRow, col: startCol, parent: null };
  const queue: PathNode[] = [start];
  const visited = new Set<string>([`${startRow},${startCol}`]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.row === endRow && current.col === endCol) {
      const path: GridPoint[] = [];
      let node: PathNode | null = current;
      while (node !== null) {
        path.unshift({ row: node.row, col: node.col });
        node = node.parent;
      }
      return path;
    }

    for (const [deltaRow, deltaColumn] of NEIGHBOR_DIRECTIONS) {
      const neighborRow = current.row + deltaRow;
      const neighborColumn = current.col + deltaColumn;
      if (neighborRow < 0 || neighborRow >= GRID_ROWS || neighborColumn < 0 || neighborColumn >= GRID_COLS) continue;
      const key = `${neighborRow},${neighborColumn}`;
      if (visited.has(key) || blocked.has(key)) continue;
      visited.add(key);
      queue.push({ row: neighborRow, col: neighborColumn, parent: current });
    }
  }

  return null;
}

function buildFullPath(towers: Tower[]): GridPoint[] {
  const core = findShortestPath(towers);
  const fallback: GridPoint[] = Array.from({ length: GRID_COLS }, (_, column) => ({
    row: PATH_ROW,
    col: column,
  }));
  const pathCells = core ?? fallback;
  return [
    { row: PATH_ROW, col: ENEMY_SPAWN_COLUMN },
    ...pathCells,
    { row: PATH_ROW, col: GRID_COLS },
  ];
}

function positionOnPath(fullPath: GridPoint[], progress: number): GridPoint {
  const maxProgress = fullPath.length - 1;
  if (progress >= maxProgress) return fullPath[maxProgress];
  const segmentIndex = Math.floor(progress);
  const interpolationFactor = progress - segmentIndex;
  const fromPoint = fullPath[segmentIndex];
  const toPoint = fullPath[segmentIndex + 1];
  return {
    row: fromPoint.row + (toPoint.row - fromPoint.row) * interpolationFactor,
    col: fromPoint.col + (toPoint.col - fromPoint.col) * interpolationFactor,
  };
}

export function createInitialState(level: number = 1): GameState {
  return {
    enemies: [],
    towers: [],
    projectiles: [],
    gold: STARTING_GOLD,
    lives: STARTING_LIVES,
    wave: 1,
    status: 'playing',
    enemiesSpawned: 0,
    enemiesKilled: 0,
    elapsedMs: 0,
    lastSpawnMs: -SPAWN_INTERVAL_MS,
    nextEnemyId: 1,
    nextTowerId: 1,
    nextProjectileId: 1,
    level: Math.max(1, Math.floor(level)),
  };
}

export function tickGame(
  prev: GameState,
  dtMs: number = TICK_MS,
  towerStatsOverride?: Record<TowerType, TowerStats>
): GameState {
  if (prev.status !== 'playing') return prev;

  const levelDifficulty = getLevelDifficulty(prev.level);
  const towerStats = resolveTowerStats(towerStatsOverride);

  let enemies: Enemy[] = [...prev.enemies];
  let towers: Tower[] = [...prev.towers];
  let projectiles = prev.projectiles
    .map((projectile) => ({ ...projectile, ttlMs: projectile.ttlMs - dtMs }))
    .filter((projectile) => projectile.ttlMs > 0);
  let {
    gold, lives, wave, status, enemiesSpawned, enemiesKilled,
    elapsedMs, lastSpawnMs, nextEnemyId, nextTowerId, nextProjectileId,
  } = prev;

  elapsedMs += dtMs;

  // ── Spawn ─────────────────────────────────────────────────────────────────
  if (enemiesSpawned < levelDifficulty.enemiesPerWave && elapsedMs - lastSpawnMs >= levelDifficulty.spawnIntervalMs) {
    const health = Math.round(
      (ENEMY_BASE_HEALTH + (wave - 1) * ENEMY_HEALTH_SCALE_PER_WAVE) *
      levelDifficulty.enemyHealthMultiplier
    );
    const spec = getEnemySpec(wave, enemiesSpawned);
    const spawnRow = spec.category === 'air' ? AIR_ROW : PATH_ROW;
    enemies = [
      ...enemies,
      {
        id: nextEnemyId++,
        col: ENEMY_SPAWN_COLUMN,
        row: spawnRow,
        pathProgress: 0,
        health,
        maxHealth: health,
        enemyType: spec.enemyType,
        category: spec.category,
      },
    ];
    enemiesSpawned++;
    lastSpawnMs = elapsedMs;
  }

  // ── Move enemies ──────────────────────────────────────────────────────────
  const fullPath = buildFullPath(towers);
  const groundColumnsPerMs = (ENEMY_SPEED * levelDifficulty.groundSpeedMultiplier) / 1000;
  const airColumnsPerMs = (ENEMY_AIR_SPEED * levelDifficulty.airSpeedMultiplier) / 1000;

  enemies = enemies.map((enemy) => {
    const category = enemy.category ?? 'ground';
    if (category === 'air') {
      // Air enemies fly in a straight horizontal line, ignoring ground towers.
      return { ...enemy, col: enemy.col + airColumnsPerMs * dtMs, row: AIR_ROW };
    }
    // Ground enemies follow the BFS path.
    const previousProgress = enemy.pathProgress ?? (enemy.col - ENEMY_SPAWN_COLUMN);
    const progress = previousProgress + groundColumnsPerMs * dtMs;
    const position = positionOnPath(fullPath, progress);
    return { ...enemy, col: position.col, row: position.row, pathProgress: progress };
  });

  // ── Enemies reaching the exit ─────────────────────────────────────────────
  let livesLost = 0;
  enemies = enemies.filter((e) => {
    if (e.col >= GRID_COLS) { livesLost++; return false; }
    return true;
  });
  lives = Math.max(0, lives - livesLost);

  // ── Tower attacks ─────────────────────────────────────────────────────────
  let mutableEnemies = [...enemies];
  let goldEarned = 0;

  towers = towers.map((tower): Tower => {
    const remainingCooldown = tower.cooldownMs - dtMs;
    if (remainingCooldown > 0) return { ...tower, cooldownMs: remainingCooldown };

    const stats = towerStats[tower.towerType ?? 'archer'];

    let target: Enemy | null = null;
    let minDist = Infinity;
    for (const enemy of mutableEnemies) {
      const enemyCat = enemy.category ?? 'ground';
      if (!stats.targets.includes(enemyCat)) continue;
      const enemyRow = enemy.row ?? (enemyCat === 'air' ? AIR_ROW : PATH_ROW);
      const dist = Math.sqrt(
        (enemy.col - tower.col) ** 2 + (enemyRow - tower.row) ** 2
      );
      if (dist <= stats.range && dist < minDist) {
        minDist = dist;
        target = enemy;
      }
    }

    if (target !== null) {
      const targetId = target.id;
      mutableEnemies = mutableEnemies.map((e) =>
        e.id === targetId ? { ...e, health: e.health - stats.damage } : e
      );

      const enemyCat = target.category ?? 'ground';
      const targetRow = target.row ?? (enemyCat === 'air' ? AIR_ROW : PATH_ROW);
      projectiles = [
        ...projectiles,
        {
          id: nextProjectileId++,
          fromRow: tower.row + 0.5,
          fromCol: tower.col + 0.5,
          toRow: targetRow + 0.5,
          toCol: target.col + 0.5,
          ttlMs: PROJECTILE_TTL_MS,
          towerType: tower.towerType ?? 'archer',
        },
      ];

      return { ...tower, cooldownMs: stats.cooldownMs };
    }
    return { ...tower, cooldownMs: 0 };
  });

  // ── Remove dead enemies ───────────────────────────────────────────────────
  enemies = mutableEnemies.filter((e) => {
    if (e.health <= 0) { goldEarned += ENEMY_GOLD_REWARD; enemiesKilled++; return false; }
    return true;
  });
  gold += goldEarned;

  // ── Wave transition ───────────────────────────────────────────────────────
  const waveComplete = enemiesSpawned >= levelDifficulty.enemiesPerWave && enemies.length === 0;
  if (waveComplete) {
    if (wave >= levelDifficulty.totalWaves) {
      status = 'won';
    } else {
      wave++;
      enemiesSpawned = 0;
      lastSpawnMs = elapsedMs + levelDifficulty.waveBreakMs - levelDifficulty.spawnIntervalMs;
    }
  }

  if (lives <= 0) status = 'lost';

  return {
    enemies, towers, projectiles, gold, lives, wave, status,
    enemiesSpawned, enemiesKilled, elapsedMs, lastSpawnMs, nextEnemyId, nextTowerId, nextProjectileId,
    level: prev.level,
  };
}

/**
 * Returns true when a tower of the given type can legally be placed at (row, col).
 * Defaults to 'archer' for backward compatibility.
 */
export function canPlaceTower(
  state: GameState,
  row: number,
  col: number,
  towerType: TowerType = 'archer',
  towerStatsOverride?: Record<TowerType, TowerStats>
): boolean {
  const towerStats = resolveTowerStats(towerStatsOverride);
  const { cost } = towerStats[towerType];
  if (state.gold < cost) return false;
  if (state.towers.some((tower) => tower.row === row && tower.col === col)) return false;
  const hypothetical: Tower[] = [
    ...state.towers,
    { id: HYPOTHETICAL_TOWER_ID, row, col, cooldownMs: 0 },
  ];
  return findShortestPath(hypothetical) !== null;
}

/**
 * Returns a new state with the tower placed, or the same state if invalid.
 * Defaults to 'archer' for backward compatibility.
 */
export function placeTower(
  state: GameState,
  row: number,
  col: number,
  towerType: TowerType = 'archer',
  towerStatsOverride?: Record<TowerType, TowerStats>
): GameState {
  const towerStats = resolveTowerStats(towerStatsOverride);
  if (!canPlaceTower(state, row, col, towerType, towerStats)) return state;
  const { cost } = towerStats[towerType];
  return {
    ...state,
    towers: [
      ...state.towers,
      { id: state.nextTowerId, row, col, cooldownMs: 0, towerType },
    ],
    gold: state.gold - cost,
    nextTowerId: state.nextTowerId + 1,
  };
}
