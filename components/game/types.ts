/** Visual sprite variant for an enemy, assigned at spawn time. */
export type EnemyType = 'goblin' | 'orc' | 'skeleton';

/** Visual sprite variant for a tower, assigned at placement time. */
export type TowerType = 'archer' | 'cannon' | 'magic';

export interface Enemy {
  id: number;
  /** Float column position (x in grid cells). */
  col: number;
  /** Float row position (y in grid cells). Defaults to PATH_ROW when not set. */
  row?: number;
  health: number;
  maxHealth: number;
  /** Kenney sprite type assigned at spawn based on the current wave. */
  enemyType?: EnemyType;
  /** Total distance traveled along the current path in cells (0 = entry off-screen). */
  pathProgress?: number;
}

export interface Tower {
  id: number;
  row: number;
  col: number;
  /** Remaining attack cooldown in ms. 0 means ready to fire. */
  cooldownMs: number;
  /** Kenney sprite type assigned at placement time. */
  towerType?: TowerType;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  enemies: Enemy[];
  towers: Tower[];
  gold: number;
  lives: number;
  wave: number;
  status: GameStatus;
  enemiesSpawned: number;
  enemiesKilled: number;
  /** Elapsed game time in ms (pauses not counted). */
  elapsedMs: number;
  /** elapsedMs at which the last enemy was spawned. */
  lastSpawnMs: number;
  nextEnemyId: number;
  nextTowerId: number;
}
