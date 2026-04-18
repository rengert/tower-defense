/** Category of enemy: walks the ground path or flies in a straight line. */
export type EnemyCategory = 'ground' | 'air';

/** Ground-enemy sprite variants. */
export type GroundEnemyType = 'goblin' | 'orc' | 'skeleton';
/** Air-enemy sprite variants (reuse existing sprites with visual distinction). */
export type AirEnemyType = 'harpy' | 'wyvern' | 'specter';
/** All enemy sprite variants. */
export type EnemyType = GroundEnemyType | AirEnemyType;

/** Visual sprite variant for a tower, assigned at placement time. */
export type TowerType = 'archer' | 'cannon' | 'magic';

export interface Enemy {
  id: number;
  /** Float column position (x in grid cells). */
  col: number;
  /** Float row position (y in grid cells). Defaults to PATH_ROW/AIR_ROW. */
  row?: number;
  health: number;
  maxHealth: number;
  /** Sprite type assigned at spawn based on the current wave. */
  enemyType?: EnemyType;
  /**
   * Whether this enemy walks on the ground path (BFS-routed) or flies in a
   * straight horizontal line. Defaults to 'ground' when absent.
   */
  category?: EnemyCategory;
  /** Total distance traveled along the current path in cells (ground enemies only). */
  pathProgress?: number;
}

export interface Tower {
  id: number;
  row: number;
  col: number;
  /** Remaining attack cooldown in ms. 0 means ready to fire. */
  cooldownMs: number;
  /** Sprite type assigned at placement time. */
  towerType?: TowerType;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  enemies: Enemy[];
  towers: Tower[];
  gold: number;
  lives: number;
  /** Current run level (meta progression difficulty tier). */
  level: number;
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
