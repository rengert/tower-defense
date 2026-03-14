export const GRID_ROWS = 10;
export const GRID_COLS = 12;
export const PATH_ROW = 4;

export const TICK_MS = 100;
export const ENEMY_SPEED = 0.5; // cells per second
export const ENEMY_SPEED_PER_TICK = (ENEMY_SPEED * TICK_MS) / 1000;

export const STARTING_GOLD = 150;
export const STARTING_LIVES = 10;

export const TOWER_COST = 50;
export const TOWER_DAMAGE = 15;
export const TOWER_RANGE = 2.5; // in cells
export const TOWER_COOLDOWN_MS = 1000;

export const ENEMY_BASE_HEALTH = 60;
export const ENEMY_HEALTH_SCALE_PER_WAVE = 20;
export const ENEMY_GOLD_REWARD = 20;
export const SPAWN_INTERVAL_MS = 2000;
export const WAVE_BREAK_MS = 4000; // pause between waves

export const TOTAL_WAVES = 3;
export const ENEMIES_PER_WAVE = 8;
