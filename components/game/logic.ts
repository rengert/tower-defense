import {
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
  TOWER_COOLDOWN_MS,
  TOWER_COST,
  TOWER_DAMAGE,
  TOWER_RANGE,
  WAVE_BREAK_MS,
} from './constants';
import type { Enemy, EnemyType, GameState, Tower, TowerType } from './types';

/** A cell coordinate on the game grid. */
export type GridPoint = { row: number; col: number };

/** Maps wave number to the Kenney enemy sprite used in that wave. */
const WAVE_ENEMY_TYPE: Record<number, EnemyType> = {
  1: 'goblin',
  2: 'orc',
  3: 'skeleton',
};

/** Kenney tower sprite types cycled through as towers are placed. */
const TOWER_TYPES: TowerType[] = ['archer', 'cannon', 'magic'];

/** Off-screen column where enemies spawn (to the left of the grid). */
const ENEMY_SPAWN_COLUMN = -1;

/** Sentinel ID used for hypothetical towers during path validation. */
const HYPOTHETICAL_TOWER_ID = -1;

/** Traversal order for the pathfinding BFS: right first so the default path goes straight along PATH_ROW. */
const NEIGHBOR_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],   // right
  [0, -1],  // left
  [-1, 0],  // up
  [1, 0],   // down
];

/**
 * Finds the shortest path from (PATH_ROW, 0) to (PATH_ROW, GRID_COLS-1),
 * avoiding cells occupied by towers, using breadth-first search.
 * Returns an array of grid cells from start to end, or null if no path exists.
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

    // Prefer moving right to get a natural straight-line default path
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

/**
 * Build the full traversal path, including the off-screen entry and exit cells.
 * Falls back to a straight line if findShortestPath returns null (should not happen in
 * normal play because canPlaceTower prevents total path blocking).
 */
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

/** Interpolates (row, col) at a given progress along a waypoint path. */
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

/**
 * Pure function: advance game state by one time step.
 *
 * @param prev  - Current game state.
 * @param dtMs  - Elapsed time in milliseconds since the last tick.
 *                Defaults to TICK_MS (100 ms) for backwards-compatibility
 *                with unit tests that call tickGame without a dt argument.
 */
export function tickGame(prev: GameState, dtMs: number = TICK_MS): GameState {
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

  elapsedMs += dtMs;

  // ── Spawn ────────────────────────────────────────────────────────────────
  // Flat ENEMIES_PER_WAVE enemies per wave (not scaled by wave index).
  if (
    enemiesSpawned < ENEMIES_PER_WAVE &&
    elapsedMs - lastSpawnMs >= SPAWN_INTERVAL_MS
  ) {
    const health = ENEMY_BASE_HEALTH + (wave - 1) * ENEMY_HEALTH_SCALE_PER_WAVE;
    const enemyType: EnemyType = WAVE_ENEMY_TYPE[wave] ?? 'goblin';
    enemies = [
      ...enemies,
      { id: nextEnemyId++, col: ENEMY_SPAWN_COLUMN, row: PATH_ROW, pathProgress: 0, health, maxHealth: health, enemyType },
    ];
    enemiesSpawned++;
    lastSpawnMs = elapsedMs;
  }

  // ── Move enemies along the shortest path ──────────────────────────────────
  const fullPath = buildFullPath(towers);
  const columnsPerMillisecond = ENEMY_SPEED / 1000;
  enemies = enemies.map((enemy) => {
    // Backward-compat: if an enemy has no pathProgress, derive it from col.
    const previousProgress = enemy.pathProgress ?? (enemy.col - ENEMY_SPAWN_COLUMN);
    const progress = previousProgress + columnsPerMillisecond * dtMs;
    const position = positionOnPath(fullPath, progress);
    return { ...enemy, col: position.col, row: position.row, pathProgress: progress };
  });

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
    const remainingCooldown = tower.cooldownMs - dtMs;
    if (remainingCooldown > 0) {
      return { ...tower, cooldownMs: remainingCooldown };
    }

    // Find the closest enemy in range
    let target: Enemy | null = null;
    let minDist = Infinity;
    for (const enemy of mutableEnemies) {
      const enemyRow = enemy.row ?? PATH_ROW;
      const dist = Math.sqrt(
        (enemy.col - tower.col) ** 2 + (enemyRow - tower.row) ** 2
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
  const waveComplete = enemiesSpawned >= ENEMIES_PER_WAVE && enemies.length === 0;

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
  if (state.gold < TOWER_COST) return false;
  if (state.towers.some((tower) => tower.row === row && tower.col === col)) return false;
  // Only allow placement when a valid path still exists after the tower is added.
  const hypothetical: Tower[] = [
    ...state.towers,
    { id: HYPOTHETICAL_TOWER_ID, row, col, cooldownMs: 0 },
  ];
  return findShortestPath(hypothetical) !== null;
}

/** Returns a new state with the tower placed (or the same state if invalid). */
export function placeTower(
  state: GameState,
  row: number,
  col: number
): GameState {
  if (!canPlaceTower(state, row, col)) return state;
  // nextTowerId starts at 1; subtract 1 so the first tower gets index 0 ('archer').
  const towerType = TOWER_TYPES[(state.nextTowerId - 1) % TOWER_TYPES.length];
  return {
    ...state,
    towers: [
      ...state.towers,
      { id: state.nextTowerId, row, col, cooldownMs: 0, towerType },
    ],
    gold: state.gold - TOWER_COST,
    nextTowerId: state.nextTowerId + 1,
  };
}
