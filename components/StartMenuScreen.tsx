import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from './i18n/LanguageContext';
import { getUpgradeCost, TOWER_UNLOCK_COST, type MetaProfile, type UpgradeStat } from './game/progression';
import type { TowerType } from './game/types';

interface Props {
  onStartGame: () => void;
  onOpenSettings: () => void;
  selectedLevel: number;
  maxLevel: number;
  profile: MetaProfile;
  onPrevLevel: () => void;
  onNextLevel: () => void;
  onUnlockTower: (towerType: TowerType) => void;
  onUpgradeTower: (towerType: TowerType, stat: UpgradeStat) => void;
}

const TOWER_ORDER: TowerType[] = ['archer', 'cannon', 'magic'];

export default function StartMenuScreen({
  onStartGame,
  onOpenSettings,
  selectedLevel,
  maxLevel,
  profile,
  onPrevLevel,
  onNextLevel,
  onUnlockTower,
  onUpgradeTower,
}: Props) {
  const { t } = useLanguage();

  const statLabel = (stat: UpgradeStat): string => {
    if (stat === 'damage') return 'DMG';
    if (stat === 'range') return 'RNG';
    return 'CDR';
  };

  const towerName = (type: TowerType): string => {
    if (type === 'archer') return t.towerArcherName;
    if (type === 'cannon') return t.towerCannonName;
    return t.towerMagicName;
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      horizontal={false}
      alwaysBounceHorizontal={false}
      bounces={false}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.content}>
      <View style={styles.heroSection}>
        <Text style={styles.towerIcon}>🗼</Text>
        <Text style={styles.title}>TOWER{`\n`}DEFENSE</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>{t.startMenuSubtitle}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Level</Text>
        <View style={styles.levelControls}>
          <TouchableOpacity
            style={[styles.levelButton, selectedLevel <= 1 && styles.levelButtonDisabled]}
            onPress={onPrevLevel}
            disabled={selectedLevel <= 1}
            accessibilityRole="button"
            accessibilityLabel="Lower level"
          >
            <Text style={styles.levelButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.levelValue}>{selectedLevel}</Text>
          <TouchableOpacity
            style={[styles.levelButton, selectedLevel >= maxLevel && styles.levelButtonDisabled]}
            onPress={onNextLevel}
            disabled={selectedLevel >= maxLevel}
            accessibilityRole="button"
            accessibilityLabel="Higher level"
          >
            <Text style={styles.levelButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.metaHint}>Unlocked: {maxLevel}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{t.gold}</Text>
        <Text style={styles.coinsValue}>{profile.coins} 💰</Text>
      </View>

      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={onStartGame}
          accessibilityRole="button"
          accessibilityLabel={t.startGameA11y}
        >
          <Text style={styles.startButtonText}>{t.startButton} · L{selectedLevel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel={t.openSettingsA11y}
        >
          <Text style={styles.settingsButtonText}>{t.settingsButton}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>{t.startHint}</Text>
      </View>

      <View style={styles.progressionPanel}>
        <Text style={styles.panelTitle}>Meta Upgrades</Text>
        {TOWER_ORDER.map((towerType) => {
          const unlocked = profile.unlockedTowers[towerType];
          const unlockCost = TOWER_UNLOCK_COST[towerType];
          const towerUpgrades = profile.upgrades[towerType];
          const canUnlock = !unlocked && profile.coins >= unlockCost;
          return (
            <View key={towerType} style={styles.towerCard}>
              <View style={styles.towerCardHeader}>
                <Text style={styles.towerCardName}>{towerName(towerType)}</Text>
                {unlocked ? (
                  <Text style={styles.unlockedBadge}>Unlocked</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.unlockButton, !canUnlock && styles.unlockButtonDisabled]}
                    onPress={() => onUnlockTower(towerType)}
                    disabled={!canUnlock}
                    accessibilityRole="button"
                    accessibilityLabel={`Unlock ${towerName(towerType)}`}
                  >
                    <Text style={styles.unlockButtonText}>Unlock {unlockCost} 💰</Text>
                  </TouchableOpacity>
                )}
              </View>

              {unlocked && (
                <View style={styles.upgradeRow}>
                  {(['damage', 'range', 'cooldown'] as UpgradeStat[]).map((stat) => {
                    const level =
                      stat === 'damage'
                        ? towerUpgrades.damageLevel
                        : stat === 'range'
                        ? towerUpgrades.rangeLevel
                        : towerUpgrades.cooldownLevel;
                    const cost = getUpgradeCost(level);
                    const disabled = level >= 8 || profile.coins < cost;
                    return (
                      <TouchableOpacity
                        key={`${towerType}-${stat}`}
                        style={[styles.upgradeButton, disabled && styles.upgradeButtonDisabled]}
                        onPress={() => onUpgradeTower(towerType, stat)}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={`${towerName(towerType)} ${statLabel(stat)} upgrade`}
                      >
                        <Text style={styles.upgradeButtonTitle}>{statLabel(stat)} L{level}</Text>
                        <Text style={styles.upgradeButtonCost}>{level >= 8 ? 'MAX' : `${cost} 💰`}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#0d1017',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 30,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  towerIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 46,
    fontWeight: '900',
    color: '#f5c842',
    letterSpacing: 5,
    textAlign: 'center',
    lineHeight: 52,
    marginBottom: 20,
  },
  divider: {
    width: 56,
    height: 3,
    backgroundColor: '#f5c842',
    borderRadius: 2,
    marginBottom: 14,
    opacity: 0.6,
  },
  subtitle: {
    fontSize: 14,
    color: '#5a7080',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  metaRow: {
    width: '100%',
    marginTop: 8,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: '#8aa2b2',
    fontSize: 13,
    fontWeight: '700',
  },
  coinsValue: {
    color: '#f5c842',
    fontSize: 17,
    fontWeight: '800',
  },
  metaHint: {
    color: '#5a7080',
    fontSize: 11,
  },
  levelControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelButton: {
    backgroundColor: 'rgba(245,200,66,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.4)',
    borderRadius: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelButtonDisabled: {
    opacity: 0.4,
  },
  levelButtonText: {
    color: '#f5c842',
    fontWeight: '800',
    fontSize: 18,
  },
  levelValue: {
    color: '#d8e8f0',
    fontWeight: '800',
    fontSize: 18,
    minWidth: 24,
    textAlign: 'center',
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0d1017',
    letterSpacing: 1,
  },
  settingsButton: {
    backgroundColor: 'transparent',
    paddingVertical: 13,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.4)',
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f5c842',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 12,
    color: '#3a4a5a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  progressionPanel: {
    width: '100%',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.16)',
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(19,24,37,0.65)',
  },
  panelTitle: {
    color: '#f5c842',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  towerCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  towerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  towerCardName: {
    color: '#d8e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  unlockedBadge: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '700',
  },
  unlockButton: {
    backgroundColor: '#0e2a1f',
    borderColor: '#3dba78',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unlockButtonDisabled: {
    opacity: 0.4,
  },
  unlockButtonText: {
    color: '#3dba78',
    fontWeight: '700',
    fontSize: 11,
  },
  upgradeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  upgradeButton: {
    width: '31%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.35)',
    backgroundColor: 'rgba(245,200,66,0.08)',
    paddingVertical: 7,
    alignItems: 'center',
    marginBottom: 8,
  },
  upgradeButtonDisabled: {
    opacity: 0.35,
  },
  upgradeButtonTitle: {
    color: '#f5c842',
    fontSize: 11,
    fontWeight: '700',
  },
  upgradeButtonCost: {
    color: '#c8d6e5',
    fontSize: 10,
    marginTop: 2,
  },
});
