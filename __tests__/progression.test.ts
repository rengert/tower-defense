import {
  DEFAULT_META_PROFILE,
  applyRunResult,
  calculateRunReward,
  getEffectiveTowerStats,
  getUpgradeCost,
  purchaseTowerUnlock,
  upgradeTowerStat,
} from '../components/game/progression';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

describe('progression', () => {
  it('rewards more coins for wins and higher levels', () => {
    const low = calculateRunReward({ won: false, level: 1, enemiesKilled: 5, wavesSurvived: 1 });
    const high = calculateRunReward({ won: true, level: 6, enemiesKilled: 20, wavesSurvived: 5 });
    expect(high).toBeGreaterThan(low);
  });

  it('unlocks next level after a win on highest unlocked level', () => {
    const next = applyRunResult(DEFAULT_META_PROFILE, {
      won: true,
      level: 1,
      enemiesKilled: 10,
      wavesSurvived: 3,
    });
    expect(next.highestLevelUnlocked).toBe(2);
    expect(next.coins).toBeGreaterThan(0);
  });

  it('can unlock cannon when enough coins are available', () => {
    const richProfile = { ...DEFAULT_META_PROFILE, coins: 500 };
    const next = purchaseTowerUnlock(richProfile, 'cannon');
    expect(next.unlockedTowers.cannon).toBe(true);
    expect(next.coins).toBeLessThan(richProfile.coins);
  });

  it('upgrades tower damage and improves effective stats', () => {
    const richProfile = {
      ...DEFAULT_META_PROFILE,
      coins: 999,
      unlockedTowers: { ...DEFAULT_META_PROFILE.unlockedTowers, cannon: true },
    };
    const upgraded = upgradeTowerStat(richProfile, 'archer', 'damage');
    const effective = getEffectiveTowerStats(upgraded);
    expect(upgraded.coins).toBe(999 - getUpgradeCost(0));
    expect(effective.archer.damage).toBeGreaterThan(getEffectiveTowerStats(DEFAULT_META_PROFILE).archer.damage);
  });
});


