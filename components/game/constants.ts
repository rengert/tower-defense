import type { EnemyCategory, InLevelUpgradeType, TowerType } from './types';

export const GRID_ROWS = 10;
export const GRID_COLS = 12;
export const PATH_ROW = 4;
/** Row where air enemies fly (clearly above the ground path). */
export const AIR_ROW = 1;

export const TICK_MS = 100;
export const ENEMY_SPEED = 0.5;        // ground enemies: cells per second
export const ENEMY_AIR_SPEED = 0.7;   // air enemies: cells per second (faster)
/** Pre-computed speed for a single fixed TICK_MS step (used in unit tests). */
export const ENEMY_SPEED_PER_TICK = (ENEMY_SPEED * TICK_MS) / 1000;

export const STARTING_GOLD = 150;
export const STARTING_LIVES = 10;

// ── Per-tower stats ────────────────────────────────────────────────────────
export interface TowerStats {
  cost: number;
  damage: number;
  /** Attack radius in grid cells. */
  range: number;
  cooldownMs: number;
  /** Which enemy categories this tower can attack. */
  targets: EnemyCategory[];
  /** Emoji shown in the build UI and on placed towers. */
  emoji: string;
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
  /** Archer – versatile, targets both ground and air enemies. */
  archer: { cost: 50, damage: 15, range: 2.5, cooldownMs: 1000, targets: ['ground', 'air'], emoji: '🏹' },
  /** Cannon – heavy artillery, ground-only, high damage, slow rate. */
  cannon: { cost: 75, damage: 35, range: 2.0, cooldownMs: 1500, targets: ['ground'],         emoji: '💣' },
  /** Magic – arcane tower, air-only, longest range, fast rate. */
  magic:  { cost: 75, damage: 25, range: 3.0, cooldownMs:  800, targets: ['air'],            emoji: '✨' },
};

/** Cheapest tower cost – used to check if ANY tower can be afforded. */
export const TOWER_COST = 50;
/** @deprecated Use TOWER_STATS[towerType].damage instead. */
export const TOWER_DAMAGE = 15;
/** @deprecated Use TOWER_STATS[towerType].range instead. */
export const TOWER_RANGE = 2.5;
/** @deprecated Use TOWER_STATS[towerType].cooldownMs instead. */
export const TOWER_COOLDOWN_MS = 1000;

export const ENEMY_BASE_HEALTH = 60;
export const ENEMY_HEALTH_SCALE_PER_WAVE = 22;
export const ENEMY_GOLD_REWARD = 20;
export const PROJECTILE_TTL_MS = 140;
export const SPAWN_INTERVAL_MS = 2000;
export const WAVE_BREAK_MS = 4000; // pause between waves

export const TOTAL_WAVES = 5;
export const ENEMIES_PER_WAVE = 10;

// ── Temporary in-level upgrades ────────────────────────────────────────────
export interface InLevelUpgradeConfig {
  /** Gold cost per purchase. */
  cost: number;
  /** Maximum number of times a single tower can buy this upgrade. */
  maxStacks: number;
  emoji: string;
  /** Short button label shown in the upgrade panel. */
  label: string;
  /** Flat damage added per stack. */
  damageBonus: number;
  /** Attack radius added in grid cells per stack. */
  rangeBonus: number;
  /** Cooldown reduced in ms per stack (clamped to minimum 200 ms). */
  cooldownReduction: number;
}

export const IN_LEVEL_UPGRADE_CONFIG: Record<InLevelUpgradeType, InLevelUpgradeConfig> = {
  /** Damage upgrade – increases flat damage per shot. */
  damage_boost: { cost: 40, maxStacks: 3, emoji: '⚔️', label: '+DMG',  damageBonus: 8, rangeBonus: 0,   cooldownReduction: 0   },
  /** Range upgrade – increases attack radius. */
  range_boost:  { cost: 40, maxStacks: 3, emoji: '🔭', label: '+RNG',  damageBonus: 0, rangeBonus: 0.5, cooldownReduction: 0   },
  /** Speed upgrade – reduces attack cooldown. */
  speed_boost:  { cost: 50, maxStacks: 3, emoji: '⚡', label: '+SPD',  damageBonus: 0, rangeBonus: 0,   cooldownReduction: 150 },
};

