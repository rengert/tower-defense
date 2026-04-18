import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameScreen from './components/GameScreen';
import {
  applyRunResult,
  DEFAULT_META_PROFILE,
  getEffectiveTowerStats,
  loadMetaProfile,
  purchaseTowerUnlock,
  saveMetaProfile,
  upgradeTowerStat,
  type UpgradeStat,
} from './components/game/progression';
import type { TowerType } from './components/game/types';
import { LanguageProvider } from './components/i18n/LanguageContext';
import SettingsScreen from './components/SettingsScreen';
import StartMenuScreen from './components/StartMenuScreen';

type Screen = 'menu' | 'game' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [metaProfile, setMetaProfile] = useState(DEFAULT_META_PROFILE);

  useEffect(() => {
    loadMetaProfile().then(setMetaProfile);
  }, []);

  const effectiveTowerStats = useMemo(() => getEffectiveTowerStats(metaProfile), [metaProfile]);
  const unlockedTowers = useMemo(
    () => (Object.keys(metaProfile.unlockedTowers) as TowerType[]).filter((towerType) => metaProfile.unlockedTowers[towerType]),
    [metaProfile]
  );

  const persistProfile = (next: typeof metaProfile) => {
    setMetaProfile(next);
    saveMetaProfile(next).catch(() => {
      // ignore persistence errors in runtime and keep session profile in memory
    });
  };

  const handleUnlockTower = (towerType: TowerType) => {
    const next = purchaseTowerUnlock(metaProfile, towerType);
    if (next !== metaProfile) persistProfile(next);
  };

  const handleUpgradeTower = (towerType: TowerType, stat: UpgradeStat) => {
    const next = upgradeTowerStat(metaProfile, towerType, stat);
    if (next !== metaProfile) persistProfile(next);
  };

  const handleRunFinished = (result: {
    won: boolean;
    level: number;
    enemiesKilled: number;
    wavesSurvived: number;
  }) => {
    const next = applyRunResult(metaProfile, result);
    persistProfile(next);
    if (result.won && selectedLevel < next.highestLevelUnlocked) {
      setSelectedLevel((prev) => Math.min(prev + 1, next.highestLevelUnlocked));
    }
  };

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          {screen === 'menu' && (
            <StartMenuScreen
              onStartGame={() => setScreen('game')}
              onOpenSettings={() => setScreen('settings')}
              selectedLevel={selectedLevel}
              maxLevel={metaProfile.highestLevelUnlocked}
              profile={metaProfile}
              onPrevLevel={() => setSelectedLevel((prev) => Math.max(1, prev - 1))}
              onNextLevel={() => setSelectedLevel((prev) => Math.min(metaProfile.highestLevelUnlocked, prev + 1))}
              onUnlockTower={handleUnlockTower}
              onUpgradeTower={handleUpgradeTower}
            />
          )}
          {screen === 'game' && (
            <GameScreen
              onQuitToMenu={() => setScreen('menu')}
              startLevel={selectedLevel}
              unlockedTowers={unlockedTowers}
              effectiveTowerStats={effectiveTowerStats}
              onRunFinished={handleRunFinished}
            />
          )}
          {screen === 'settings' && (
            <SettingsScreen onBack={() => setScreen('menu')} />
          )}
        </View>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1017',
  },
});
