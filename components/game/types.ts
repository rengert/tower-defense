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

/** Temporary per-tower upgrade types that only last for the current run. */
export type InLevelUpgradeType = 'damage_boost' | 'range_boost' | 'speed_boost';

/** Visual variant for static map obstacles. */
export type ObstacleVariant = 'rockA' | 'rockB' | 'rockC';

export interface Obstacle {
  id: number;
  row: number;
  col: number;
  variant: ObstacleVariant;
}

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
  /** Original ground spawn row; used to keep pathing stable per enemy. */
  spawnRow?: number;
}

export interface SpawnMarker {
  row: number;
  category: EnemyCategory;
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

/** Short-lived visual projectile spawned when a tower fires. */
export interface Projectile {
  id: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  /** Remaining lifespan in ms. Projectile is removed at <= 0. */
  ttlMs: number;
  towerType: TowerType;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  enemies: Enemy[];
  towers: Tower[];
  obstacles: Obstacle[];
  spawnMarkers: SpawnMarker[];
  projectiles: Projectile[];
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
  nextProjectileId: number;
  /**
   * Temporary in-level upgrades per tower (keyed by tower ID).
   * Each entry maps an InLevelUpgradeType to the number of purchased stacks.
   * Cleared when the run ends or a new game starts.
   */
  inLevelUpgrades: Record<number, Partial<Record<InLevelUpgradeType, number>>>;
}
