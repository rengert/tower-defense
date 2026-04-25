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
import type {
  EnemyCategory,
  EnemyType,
  Enemy,
  GameState,
  Obstacle,
  ObstacleVariant,
  SpawnMarker,
  Tower,
  TowerType,
} from './types';

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
    enemyHealthMultiplier: 1 + (safeLevel - 1) * 0.2,
    groundSpeedMultiplier: 1 + (safeLevel - 1) * 0.05,
    airSpeedMultiplier: 1 + (safeLevel - 1) * 0.06,
    spawnIntervalMs: Math.max(850, SPAWN_INTERVAL_MS - (safeLevel - 1) * 70),
    enemiesPerWave: ENEMIES_PER_WAVE + Math.floor((safeLevel - 1) / 2),
    totalWaves: TOTAL_WAVES + Math.floor((safeLevel - 1) / 2),
    waveBreakMs: Math.max(1100, WAVE_BREAK_MS - (safeLevel - 1) * 130),
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

/** Deterministic obstacle generation tuning. */
const BASE_OBSTACLE_COUNT = 4;
const MAX_OBSTACLE_COUNT = 14;
const OBSTACLE_PLACEMENT_ATTEMPTS = 3;
const OBSTACLE_VARIANTS: readonly ObstacleVariant[] = ['rockA', 'rockB', 'rockC'];
const BASE_GROUND_SPAWN_ROWS = Array.from(new Set([
  Math.max(0, PATH_ROW - 2),
  PATH_ROW,
  Math.min(GRID_ROWS - 1, PATH_ROW + 2),
]));
const BASE_AIR_SPAWN_ROWS = Array.from(new Set([
  Math.max(0, AIR_ROW - 1),
  AIR_ROW,
  Math.min(GRID_ROWS - 1, AIR_ROW + 1),
]));

/** Traversal order: right first so the default path goes straight along PATH_ROW. */
const NEIGHBOR_DIRECTIONS: readonly (readonly [number, number])[] = [
  [0, 1],   // right
  [0, -1],  // left
  [-1, 0],  // up
  [1, 0],   // down
];

function toCellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function buildBlockedSet(towers: Tower[], obstacles: Obstacle[]): Set<string> {
  const blocked = new Set<string>();
  for (const tower of towers) {
    blocked.add(toCellKey(tower.row, tower.col));
  }
  for (const obstacle of obstacles) {
    blocked.add(toCellKey(obstacle.row, obstacle.col));
  }
  return blocked;
}

function clampGridIndex(value: number, maxExclusive: number): number {
  return Math.max(0, Math.min(maxExclusive - 1, Math.floor(value)));
}

function segmentIntersectsCell(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
  obstacle: Obstacle
): boolean {
  const left = obstacle.col;
  const right = obstacle.col + 1;
  const top = obstacle.row;
  const bottom = obstacle.row + 1;
  const deltaX = toCol - fromCol;
  const deltaY = toRow - fromRow;

  let tMin = 0;
  let tMax = 1;

  const clips: Array<[number, number]> = [
    [-deltaX, fromCol - left],
    [deltaX, right - fromCol],
    [-deltaY, fromRow - top],
    [deltaY, bottom - fromRow],
  ];

  for (const [p, q] of clips) {
    if (p === 0) {
      if (q < 0) {
        return false;
      }
      continue;
    }

    const ratio = q / p;
    if (p < 0) {
      if (ratio > tMax) {
        return false;
      }
      tMin = Math.max(tMin, ratio);
    } else {
      if (ratio < tMin) {
        return false;
      }
      tMax = Math.min(tMax, ratio);
    }
  }

  return tMin <= tMax;
}

/**
 * Returns whether the tower has an unobstructed shot to the enemy.
 * Obstacles block the line segment between both cell centers, except when the
 * obstacle is on the enemy's current cell.
 */
export function hasLineOfSight(tower: Tower, enemy: Enemy, obstacles: Obstacle[]): boolean {
  if (obstacles.length === 0) {
    return true;
  }

  const enemyCategory = enemy.category ?? 'ground';
  const targetRow = enemy.row ?? (enemyCategory === 'air' ? AIR_ROW : PATH_ROW);
  const targetCellRow = clampGridIndex(targetRow, GRID_ROWS);
  const targetCellCol = clampGridIndex(enemy.col, GRID_COLS);
  const fromCol = tower.col + 0.5;
  const fromRow = tower.row + 0.5;
  const toCol = enemy.col + 0.5;
  const toRow = targetRow + 0.5;

  for (const obstacle of obstacles) {
    if (obstacle.row === targetCellRow && obstacle.col === targetCellCol) {
      continue;
    }

    if (segmentIntersectsCell(fromCol, fromRow, toCol, toRow, obstacle)) {
      return false;
    }
  }

  return true;
}

function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickObstacleVariant(index: number, random: () => number): ObstacleVariant {
  const offset = Math.floor(random() * OBSTACLE_VARIANTS.length);
  return OBSTACLE_VARIANTS[(index + offset) % OBSTACLE_VARIANTS.length];
}

function shufflePoints(points: GridPoint[], random: () => number): GridPoint[] {
  const copy = [...points];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds deterministic obstacle layouts while guaranteeing at least one
 * navigable ground path from spawn to exit.
 */
export function generateObstaclesForLevel(level: number): Obstacle[] {
  const safeLevel = Math.max(1, Math.floor(level));
  const targetCount = Math.min(
    MAX_OBSTACLE_COUNT,
    BASE_OBSTACLE_COUNT + Math.floor((safeLevel - 1) * 1.5)
  );

  const candidates: GridPoint[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      // Keep spawn and exit anchors free.
      if (row === PATH_ROW && (col === 0 || col === GRID_COLS - 1)) continue;
      candidates.push({ row, col });
    }
  }

  for (let attempt = 0; attempt < OBSTACLE_PLACEMENT_ATTEMPTS; attempt++) {
    const random = createSeededRng(safeLevel * 1009 + 17 + attempt * 53);
    const ordered = shufflePoints(candidates, random);
    const obstacles: Obstacle[] = [];

    for (const point of ordered) {
      if (obstacles.length >= targetCount) break;
      const nextObstacle: Obstacle = {
        id: obstacles.length + 1,
        row: point.row,
        col: point.col,
        variant: pickObstacleVariant(obstacles.length, random),
      };
      const withCandidate = [...obstacles, nextObstacle];
      if (findShortestPath([], withCandidate) !== null) {
        obstacles.push(nextObstacle);
      }
    }

    if (findShortestPath([], obstacles) !== null) {
      return obstacles;
    }
  }

  return [];
}

function findShortestPathBetween(
  towers: Tower[],
  obstacles: Obstacle[],
  startRow: number,
  endRow: number
): GridPoint[] | null {
  const blocked = buildBlockedSet(towers, obstacles);

  const normalizedStartRow = clampGridIndex(startRow, GRID_ROWS);
  const normalizedEndRow = clampGridIndex(endRow, GRID_ROWS);
  const startCol = 0;
  const endCol = GRID_COLS - 1;

  if (blocked.has(toCellKey(normalizedStartRow, startCol)) || blocked.has(toCellKey(normalizedEndRow, endCol))) {
    return null;
  }

  type PathNode = { row: number; col: number; parent: PathNode | null };
  const start: PathNode = { row: normalizedStartRow, col: startCol, parent: null };
  const queue: PathNode[] = [start];
  const visited = new Set<string>([toCellKey(normalizedStartRow, startCol)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.row === normalizedEndRow && current.col === endCol) {
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
      const key = toCellKey(neighborRow, neighborColumn);
      if (visited.has(key) || blocked.has(key)) continue;
      visited.add(key);
      queue.push({ row: neighborRow, col: neighborColumn, parent: current });
    }
  }

  return null;
}

function getGroundSpawnRows(towers: Tower[], obstacles: Obstacle[]): number[] {
  return BASE_GROUND_SPAWN_ROWS.filter((row) =>
    findShortestPathBetween(towers, obstacles, row, PATH_ROW) !== null
  );
}

function getNextSpawnIndexForCategory(
  wave: number,
  enemiesSpawned: number,
  enemiesPerWave: number,
  category: EnemyCategory
): number | null {
  for (let index = enemiesSpawned; index < enemiesPerWave; index++) {
    if (getEnemySpec(wave, index).category === category) {
      return index;
    }
  }
  return null;
}

function getSpawnMarkers(
  towers: Tower[],
  obstacles: Obstacle[],
  enemies: Enemy[],
  wave: number,
  enemiesSpawned: number,
  enemiesPerWave: number
): SpawnMarker[] {
  const markers: SpawnMarker[] = [];
  const groundRows = getGroundSpawnRows(towers, obstacles);

  const pendingGround = enemies.find((enemy) => (enemy.category ?? 'ground') === 'ground' && enemy.col < 0);
  if (pendingGround) {
    markers.push({ row: clampGridIndex(pendingGround.spawnRow ?? pendingGround.row ?? PATH_ROW, GRID_ROWS), category: 'ground' });
  } else {
    const nextGroundIndex = getNextSpawnIndexForCategory(wave, enemiesSpawned, enemiesPerWave, 'ground');
    if (nextGroundIndex !== null) {
      markers.push({
        row: pickSpawnRow(groundRows, nextGroundIndex + wave, PATH_ROW),
        category: 'ground',
      });
    }
  }

  const pendingAir = enemies.find((enemy) => (enemy.category ?? 'ground') === 'air' && enemy.col < 0);
  if (pendingAir) {
    markers.push({ row: clampGridIndex(pendingAir.row ?? AIR_ROW, GRID_ROWS), category: 'air' });
  } else {
    const nextAirIndex = getNextSpawnIndexForCategory(wave, enemiesSpawned, enemiesPerWave, 'air');
    if (nextAirIndex !== null) {
      markers.push({
        row: pickSpawnRow(BASE_AIR_SPAWN_ROWS, nextAirIndex + wave, AIR_ROW),
        category: 'air',
      });
    }
  }

  return markers;
}

function pickSpawnRow(rows: number[], offset: number, fallback: number): number {
  if (rows.length === 0) return fallback;
  const index = Math.abs(offset) % rows.length;
  return rows[index];
}

/**
 * Finds the shortest path for ground enemies from (PATH_ROW, 0) to
 * (PATH_ROW, GRID_COLS-1), avoiding cells occupied by towers.
 * Returns an array of grid cells, or null if no path exists.
 */
export function findShortestPath(towers: Tower[], obstacles: Obstacle[] = []): GridPoint[] | null {
  return findShortestPathBetween(towers, obstacles, PATH_ROW, PATH_ROW);
}

function buildFullPath(towers: Tower[], obstacles: Obstacle[], startRow: number): GridPoint[] {
  const core = findShortestPathBetween(towers, obstacles, startRow, PATH_ROW);
  const fallback: GridPoint[] = Array.from({ length: GRID_COLS }, (_, column) => ({
    row: startRow,
    col: column,
  }));
  const pathCells = core ?? fallback;
  return [
    { row: startRow, col: ENEMY_SPAWN_COLUMN },
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
  const safeLevel = Math.max(1, Math.floor(level));
  const obstacles = generateObstaclesForLevel(safeLevel);
  const levelDifficulty = getLevelDifficulty(safeLevel);
  return {
    enemies: [],
    towers: [],
    obstacles,
    spawnMarkers: getSpawnMarkers([], obstacles, [], 1, 0, levelDifficulty.enemiesPerWave),
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
    level: safeLevel,
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
  const obstacles = prev.obstacles;
  let projectiles = prev.projectiles
    .map((projectile) => ({ ...projectile, ttlMs: projectile.ttlMs - dtMs }))
    .filter((projectile) => projectile.ttlMs > 0);
  let {
    gold, lives, wave, enemiesSpawned, enemiesKilled,
    elapsedMs, lastSpawnMs, nextEnemyId, nextTowerId, nextProjectileId,
  } = prev;
  let status: 'playing' | 'won' | 'lost' = 'playing';

  elapsedMs += dtMs;

  // ── Spawn ─────────────────────────────────────────────────────────────────
  if (enemiesSpawned < levelDifficulty.enemiesPerWave && elapsedMs - lastSpawnMs >= levelDifficulty.spawnIntervalMs) {
    const health = Math.round(
      (ENEMY_BASE_HEALTH + (wave - 1) * ENEMY_HEALTH_SCALE_PER_WAVE) *
      levelDifficulty.enemyHealthMultiplier
    );
    const spec = getEnemySpec(wave, enemiesSpawned);
    const groundSpawnRows = getGroundSpawnRows(towers, obstacles);
    const spawnRow = spec.category === 'air'
      ? pickSpawnRow(BASE_AIR_SPAWN_ROWS, enemiesSpawned + wave, AIR_ROW)
      : pickSpawnRow(groundSpawnRows, enemiesSpawned + wave, PATH_ROW);
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
        spawnRow: spec.category === 'ground' ? spawnRow : undefined,
      },
    ];
    enemiesSpawned++;
    lastSpawnMs = elapsedMs;
  }

  // ── Move enemies ──────────────────────────────────────────────────────────
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
    const enemySpawnRow = enemy.spawnRow ?? PATH_ROW;
    const enemyPath = buildFullPath(towers, obstacles, enemySpawnRow);
    const position = positionOnPath(enemyPath, progress);
    return { ...enemy, col: position.col, row: position.row, pathProgress: progress, spawnRow: enemySpawnRow };
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
      if (!hasLineOfSight(tower, enemy, obstacles)) continue;
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

  const spawnMarkers = getSpawnMarkers(
    towers,
    obstacles,
    enemies,
    wave,
    enemiesSpawned,
    levelDifficulty.enemiesPerWave
  );

  return {
    enemies, towers, obstacles, spawnMarkers, projectiles, gold, lives, wave, status,
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
  if (state.obstacles.some((obstacle) => obstacle.row === row && obstacle.col === col)) return false;
  const hypothetical: Tower[] = [
    ...state.towers,
    { id: HYPOTHETICAL_TOWER_ID, row, col, cooldownMs: 0 },
  ];
  return getGroundSpawnRows(hypothetical, state.obstacles).length > 0;
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
