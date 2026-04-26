import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOWER_STATS, type TowerStats } from './constants';
import type { TowerType } from './types';

const STORAGE_KEY = '@tower_defense_meta_profile_v1';

export type UpgradeStat = 'damage' | 'range' | 'cooldown';

export interface TowerUpgradeState {
  damageLevel: number;
  rangeLevel: number;
  cooldownLevel: number;
}

export interface MetaProfile {
  coins: number;
  highestLevelUnlocked: number;
  unlockedTowers: Record<TowerType, boolean>;
  upgrades: Record<TowerType, TowerUpgradeState>;
  /** Consecutive wins without a loss. */
  winStreak: number;
  /** Highest consecutive win streak achieved. */
  bestWinStreak: number;
  /** Levels that were cleared at least once (for one-time bonuses). */
  firstClearLevels: number[];
}

export interface RunResult {
  won: boolean;
  level: number;
  enemiesKilled: number;
  wavesSurvived: number;
}

const DEFAULT_TOWER_UPGRADE: TowerUpgradeState = {
  damageLevel: 0,
  rangeLevel: 0,
  cooldownLevel: 0,
};

export const DEFAULT_META_PROFILE: MetaProfile = {
  coins: 0,
  highestLevelUnlocked: 1,
  unlockedTowers: {
    archer: true,
    cannon: false,
    magic: false,
  },
  upgrades: {
    archer: { ...DEFAULT_TOWER_UPGRADE },
    cannon: { ...DEFAULT_TOWER_UPGRADE },
    magic: { ...DEFAULT_TOWER_UPGRADE },
  },
  winStreak: 0,
  bestWinStreak: 0,
  firstClearLevels: [],
};

export const TOWER_UNLOCK_COST: Record<TowerType, number> = {
  archer: 0,
  cannon: 220,
  magic: 280,
};

const UPGRADE_CAP = 8;
const FIRST_CLEAR_BASE_BONUS = 100;
const FIRST_CLEAR_LEVEL_BONUS = 25;
const STREAK_BONUS_PER_WIN = 12;
const STREAK_BONUS_CAP = 140;

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeFirstClearLevels(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<number>();
  for (const rawLevel of value) {
    if (typeof rawLevel !== 'number' || !Number.isFinite(rawLevel)) continue;
    unique.add(Math.max(1, Math.floor(rawLevel)));
  }
  return Array.from(unique).sort((a, b) => a - b);
}

function normalizeMetaProfile(parsed: Partial<MetaProfile>): MetaProfile {
  const normalizedWinStreak = Math.max(0, Math.floor(normalizeNumber(parsed.winStreak, 0)));
  const normalizedBestStreak = Math.max(
    normalizedWinStreak,
    Math.floor(normalizeNumber(parsed.bestWinStreak, 0))
  );

  return {
    ...DEFAULT_META_PROFILE,
    ...parsed,
    unlockedTowers: {
      ...DEFAULT_META_PROFILE.unlockedTowers,
      ...(parsed.unlockedTowers ?? {}),
    },
    upgrades: {
      archer: { ...DEFAULT_TOWER_UPGRADE, ...(parsed.upgrades?.archer ?? {}) },
      cannon: { ...DEFAULT_TOWER_UPGRADE, ...(parsed.upgrades?.cannon ?? {}) },
      magic: { ...DEFAULT_TOWER_UPGRADE, ...(parsed.upgrades?.magic ?? {}) },
    },
    winStreak: normalizedWinStreak,
    bestWinStreak: normalizedBestStreak,
    firstClearLevels: normalizeFirstClearLevels(parsed.firstClearLevels),
  };
}

function getFirstClearBonus(level: number): number {
  return FIRST_CLEAR_BASE_BONUS + level * FIRST_CLEAR_LEVEL_BONUS;
}

function getStreakBonus(nextWinStreak: number): number {
  return Math.min(STREAK_BONUS_CAP, Math.max(0, nextWinStreak) * STREAK_BONUS_PER_WIN);
}

export function getUpgradeCost(level: number): number {
  return 60 + level * 45;
}

export function loadMetaProfile(): Promise<MetaProfile> {
  return AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (!raw) return DEFAULT_META_PROFILE;
      const parsed = JSON.parse(raw) as Partial<MetaProfile>;
      return normalizeMetaProfile(parsed);
    })
    .catch(() => DEFAULT_META_PROFILE);
}

export async function saveMetaProfile(profile: MetaProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getEffectiveTowerStats(profile: MetaProfile): Record<TowerType, TowerStats> {
  const result: Record<TowerType, TowerStats> = {
    archer: { ...TOWER_STATS.archer },
    cannon: { ...TOWER_STATS.cannon },
    magic: { ...TOWER_STATS.magic },
  };

  (Object.keys(result) as TowerType[]).forEach((towerType) => {
    const upgrade = profile.upgrades[towerType];
    const base = result[towerType];
    result[towerType] = {
      ...base,
      damage: Math.round(base.damage * (1 + upgrade.damageLevel * 0.09)),
      range: Number((base.range * (1 + upgrade.rangeLevel * 0.04)).toFixed(2)),
      cooldownMs: Math.max(
        240,
        Math.round(base.cooldownMs * (1 - upgrade.cooldownLevel * 0.06))
      ),
    };
  });

  return result;
}

export function purchaseTowerUnlock(profile: MetaProfile, towerType: TowerType): MetaProfile {
  if (profile.unlockedTowers[towerType]) return profile;
  const cost = TOWER_UNLOCK_COST[towerType];
  if (profile.coins < cost) return profile;
  return {
    ...profile,
    coins: profile.coins - cost,
    unlockedTowers: {
      ...profile.unlockedTowers,
      [towerType]: true,
    },
  };
}

export function upgradeTowerStat(
  profile: MetaProfile,
  towerType: TowerType,
  stat: UpgradeStat
): MetaProfile {
  if (!profile.unlockedTowers[towerType]) return profile;

  const upgrades = profile.upgrades[towerType];
  const currentLevel =
    stat === 'damage'
      ? upgrades.damageLevel
      : stat === 'range'
      ? upgrades.rangeLevel
      : upgrades.cooldownLevel;

  if (currentLevel >= UPGRADE_CAP) return profile;

  const cost = getUpgradeCost(currentLevel);
  if (profile.coins < cost) return profile;

  const nextTowerUpgrades: TowerUpgradeState = {
    ...upgrades,
    damageLevel: stat === 'damage' ? currentLevel + 1 : upgrades.damageLevel,
    rangeLevel: stat === 'range' ? currentLevel + 1 : upgrades.rangeLevel,
    cooldownLevel: stat === 'cooldown' ? currentLevel + 1 : upgrades.cooldownLevel,
  };

  return {
    ...profile,
    coins: profile.coins - cost,
    upgrades: {
      ...profile.upgrades,
      [towerType]: nextTowerUpgrades,
    },
  };
}

export function calculateRunReward(result: RunResult): number {
  const killReward = result.enemiesKilled * 4;
  const waveReward = result.wavesSurvived * 25;
  const levelReward = result.level * 20;
  const outcomeBonus = result.won ? 140 + result.level * 12 : 30;
  return killReward + waveReward + levelReward + outcomeBonus;
}

export function applyRunResult(profile: MetaProfile, result: RunResult): MetaProfile {
  const reward = calculateRunReward(result);
  const isFirstClearWin = result.won && !profile.firstClearLevels.includes(result.level);
  const nextWinStreak = result.won ? profile.winStreak + 1 : 0;
  const streakBonus = result.won ? getStreakBonus(nextWinStreak) : 0;
  const firstClearBonus = isFirstClearWin ? getFirstClearBonus(result.level) : 0;
  const unlockedNext = result.won && result.level >= profile.highestLevelUnlocked
    ? profile.highestLevelUnlocked + 1
    : profile.highestLevelUnlocked;
  const nextFirstClearLevels = isFirstClearWin
    ? [...profile.firstClearLevels, result.level]
    : profile.firstClearLevels;

  return {
    ...profile,
    coins: profile.coins + reward + streakBonus + firstClearBonus,
    highestLevelUnlocked: unlockedNext,
    winStreak: nextWinStreak,
    bestWinStreak: Math.max(profile.bestWinStreak, nextWinStreak),
    firstClearLevels: nextFirstClearLevels,
  };
}
