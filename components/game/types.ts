export interface Enemy {
  id: number;
  /** Float column position along PATH_ROW (left = 0, right = GRID_COLS). */
  col: number;
  health: number;
  maxHealth: number;
}

export interface Tower {
  id: number;
  row: number;
  col: number;
  /** Remaining attack cooldown in ms. 0 means ready to fire. */
  cooldownMs: number;
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
