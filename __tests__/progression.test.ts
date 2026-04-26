import {
  DEFAULT_META_PROFILE,
  applyRunResult,
  calculateRunReward,
  getEffectiveTowerStats,
  getUpgradeCost,
  loadMetaProfile,
  purchaseTowerUnlock,
  upgradeTowerStat,
} from '../components/game/progression';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  it('applies first-clear bonus only once per level', () => {
    const first = applyRunResult(DEFAULT_META_PROFILE, {
      won: true,
      level: 1,
      enemiesKilled: 5,
      wavesSurvived: 3,
    });
    const second = applyRunResult(first, {
      won: true,
      level: 1,
      enemiesKilled: 5,
      wavesSurvived: 3,
    });

    const firstDelta = first.coins - DEFAULT_META_PROFILE.coins;
    const secondDelta = second.coins - first.coins;
    expect(first.firstClearLevels).toContain(1);
    expect(firstDelta).toBeGreaterThan(secondDelta);
  });

  it('builds and resets win streak based on outcome', () => {
    const win1 = applyRunResult(DEFAULT_META_PROFILE, {
      won: true,
      level: 1,
      enemiesKilled: 5,
      wavesSurvived: 2,
    });
    const win2 = applyRunResult(win1, {
      won: true,
      level: 2,
      enemiesKilled: 6,
      wavesSurvived: 2,
    });
    const loss = applyRunResult(win2, {
      won: false,
      level: 2,
      enemiesKilled: 2,
      wavesSurvived: 1,
    });

    expect(win2.winStreak).toBeGreaterThan(win1.winStreak);
    expect(win2.bestWinStreak).toBe(win2.winStreak);
    expect(loss.winStreak).toBe(0);
  });

  it('adds first-clear and streak bonus coins on wins', () => {
    const firstWin = applyRunResult(DEFAULT_META_PROFILE, {
      won: true,
      level: 2,
      enemiesKilled: 8,
      wavesSurvived: 3,
    });
    const baseReward = calculateRunReward({
      won: true,
      level: 2,
      enemiesKilled: 8,
      wavesSurvived: 3,
    });
    expect(firstWin.coins).toBeGreaterThan(baseReward);

    const secondWinSameLevel = applyRunResult(firstWin, {
      won: true,
      level: 2,
      enemiesKilled: 8,
      wavesSurvived: 3,
    });
    const secondDelta = secondWinSameLevel.coins - firstWin.coins;
    expect(secondDelta).toBeGreaterThan(baseReward);
  });

  it('migrates old stored profiles and fills motivation defaults', async () => {
    const mockedStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockedStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        coins: 120,
        highestLevelUnlocked: 3,
        unlockedTowers: { archer: true, cannon: true },
      })
    );

    const loaded = await loadMetaProfile();
    expect(loaded.coins).toBe(120);
    expect(loaded.highestLevelUnlocked).toBe(3);
    expect(loaded.unlockedTowers.cannon).toBe(true);
    expect(loaded.winStreak).toBe(0);
    expect(loaded.bestWinStreak).toBe(0);
    expect(loaded.firstClearLevels).toEqual([]);
  });
});


