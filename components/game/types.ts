/** Visual sprite variant for an enemy, assigned at spawn time. */
export type EnemyType = 'goblin' | 'orc' | 'skeleton';

/** Visual sprite variant for a tower, assigned at placement time. */
export type TowerType = 'archer' | 'cannon' | 'magic';

export interface Enemy {
  id: number;
  /** Float column position along PATH_ROW (left = 0, right = GRID_COLS). */
  col: number;
  health: number;
  maxHealth: number;
  /** Kenney sprite type assigned at spawn based on the current wave. */
  enemyType?: EnemyType;
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
