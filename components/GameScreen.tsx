import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from './i18n/LanguageContext';
import PixiGameRenderer, { type RenderDiagnostics } from './PixiGameRenderer';
import PauseMenuScreen from './PauseMenuScreen';
import { type TowerStats } from './game/constants';
import { createInitialState, getLevelDifficulty, placeTower, tickGame } from './game/logic';
import type { GameState, GameStatus, TowerType } from './game/types';

interface Props {
  onQuitToMenu: () => void;
  startLevel: number;
  unlockedTowers: TowerType[];
  effectiveTowerStats: Record<TowerType, TowerStats>;
  onRunFinished: (result: {
    won: boolean;
    level: number;
    enemiesKilled: number;
    wavesSurvived: number;
  }) => void;
}

export default function GameScreen({
  onQuitToMenu,
  startLevel,
  unlockedTowers,
  effectiveTowerStats,
  onRunFinished,
}: Props) {
  const { t } = useLanguage();
  const [paused, setPaused] = useState(false);
  const [buildTowerType, setBuildTowerType] = useState<TowerType | null>(null);
  /** Tower selected for in-level upgrades. Null = no selection. */
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null);
  /**
   * Bumped whenever in-level upgrades change so the panel re-renders
   * (gameRef is a ref and doesn't trigger re-renders by itself).
   */
  const [hudUpgradesVersion, setHudUpgradesVersion] = useState(0);

  // ── Shared game state ──────────────────────────────────────────────────────
  // Game state lives in a ref so the PixiJS ticker can read it without causing
  // React re-renders on every frame. HUD-visible values are mirrored into React
  // state and updated whenever they change.
  const gameRef = useRef<GameState>(createInitialState(startLevel));
  const [hudGold, setHudGold] = useState(gameRef.current.gold);
  const [hudLives, setHudLives] = useState(gameRef.current.lives);
  const [hudWave, setHudWave] = useState(gameRef.current.wave);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [renderDiagnostics, setRenderDiagnostics] = useState<RenderDiagnostics>({
    glReady: false,
    rendererReady: false,
    frameCount: 0,
    lastFrameMs: null,
    lastError: null,
  });
  const reportedEndRef = useRef(false);
  const levelDifficulty = getLevelDifficulty(startLevel);
  const towerChoices = unlockedTowers;

  // ── HUD sync helper ────────────────────────────────────────────────────────
  // Only updates the React state values that actually changed to avoid excess renders.
  const syncHudState = useCallback(
    (prev: GameState, next: GameState) => {
      if (next.gold !== prev.gold) setHudGold(next.gold);
      if (next.lives !== prev.lives) setHudLives(next.lives);
      if (next.wave !== prev.wave) setHudWave(next.wave);
      if (next.status !== prev.status) setGameStatus(next.status);
    },
    []
  );

  // ── Game tick ─────────────────────────────────────────────────────────────
  const handleTick = useCallback(
    (dtMs: number) => {
      if (paused) return;
      const prev = gameRef.current;
      const next = tickGame(prev, dtMs, effectiveTowerStats);
      gameRef.current = next;
      syncHudState(prev, next);
    },
    [effectiveTowerStats, paused, syncHudState]
  );

  // ── Tower placement ───────────────────────────────────────────────────────
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (gameRef.current.status !== 'playing') return;

      // If the tapped cell has an existing tower → select it for upgrading.
      const existingTower = gameRef.current.towers.find(
        (t) => t.row === row && t.col === col
      );
      if (existingTower) {
        setSelectedTowerId(existingTower.id);
        setBuildTowerType(null);
        return;
      }

      // Tapping an empty cell dismisses the upgrade panel.
      setSelectedTowerId(null);

      if (!buildTowerType) return;
      const prev = gameRef.current;
      const next = placeTower(prev, row, col, buildTowerType, effectiveTowerStats);
      if (next !== prev) {
        gameRef.current = next;
        syncHudState(prev, next);
      }
    },
    [buildTowerType, effectiveTowerStats, syncHudState]
  );

  // ── Restart ───────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    const prev = gameRef.current;
    const fresh = createInitialState(startLevel);
    gameRef.current = fresh;
    reportedEndRef.current = false;
    setBuildTowerType(null);
    setSelectedTowerId(null);
    setHudUpgradesVersion(0);
    syncHudState(prev, fresh);
  }, [startLevel, syncHudState]);

  useEffect(() => {
    if ((gameStatus !== 'won' && gameStatus !== 'lost') || reportedEndRef.current) return;
    reportedEndRef.current = true;
    setSelectedTowerId(null);
    onRunFinished({
      won: gameStatus === 'won',
      level: startLevel,
      enemiesKilled: gameRef.current.enemiesKilled,
      wavesSurvived: hudWave,
    });
  }, [gameStatus, hudWave, onRunFinished, startLevel]);

  const isPlaying = gameStatus === 'playing';

  // ── In-level tower upgrade ────────────────────────────────────────────────
  const handleUpgradePurchase = useCallback(
    (upgradeType: InLevelUpgradeType) => {
      if (selectedTowerId === null) return;
      const prev = gameRef.current;
      const next = purchaseInLevelUpgrade(prev, selectedTowerId, upgradeType);
      if (next !== prev) {
        gameRef.current = next;
        syncHudState(prev, next);
        setHudUpgradesVersion((v) => v + 1);
      }
    },
    [selectedTowerId, syncHudState]
  );

  return (
    <View style={styles.container}>
      {/* ── Header HUD ──────────────────────────────────────────────────── */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.waveBadge}>
            <Text style={styles.waveLabel}>{t.wave}</Text>
            <Text style={styles.waveValue}>{hudWave}/{levelDifficulty.totalWaves}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statIcon}>❤️</Text>
              <Text style={styles.statValue}>{hudLives}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={styles.statValue}>{hudGold}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={() => setPaused(true)}
            accessibilityRole="button"
            accessibilityLabel={t.pauseGameA11y}
          >
            <Text style={styles.pauseButtonText}>⏸</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── PixiJS game board ────────────────────────────────────────────── */}
      <PixiGameRenderer
        onTick={handleTick}
        onCellPress={handleCellPress}
        gameStateRef={gameRef}
        running={isPlaying && !paused}
        buildTowerType={buildTowerType}
        onDiagnosticsChange={setRenderDiagnostics}
      />

      {__DEV__ && (
        <View style={styles.debugBadge} pointerEvents="none">
          <Text style={styles.debugText}>
            GL:{renderDiagnostics.glReady ? 'OK' : '...'} R:{renderDiagnostics.rendererReady ? 'OK' : '...'} F:{renderDiagnostics.frameCount}
          </Text>
          {renderDiagnostics.lastError && (
            <Text style={styles.debugError} numberOfLines={1}>
              ERR: {renderDiagnostics.lastError}
            </Text>
          )}
        </View>
      )}

      {/* ── Footer – Build Controls / Tower Upgrades ─────────────────── */}
      <View style={styles.footer}>
        {selectedTowerId !== null && isPlaying ? (
          /* ── Upgrade Panel ──────────────────────────────────────────── */
          (() => {
            const tower = gameRef.current.towers.find((t) => t.id === selectedTowerId);
            if (!tower) return null;
            const towerType = tower.towerType ?? 'archer';
            const baseStats = effectiveTowerStats[towerType];
            const upgrades = gameRef.current.inLevelUpgrades[selectedTowerId] ?? {};
            const boosted = getInLevelBoostedStats(baseStats, upgrades);
            const towerEmoji = baseStats.emoji;
            const towerName =
              towerType === 'archer'
                ? t.towerArcherName
                : towerType === 'cannon'
                ? t.towerCannonName
                : t.towerMagicName;
            const upgradeTypes: InLevelUpgradeType[] = [
              'damage_boost',
              'range_boost',
              'speed_boost',
            ];
            return (
              <View>
                {/* Panel header */}
                <View style={styles.upgradePanelHeader}>
                  <Text style={styles.upgradePanelTitle}>
                    {towerEmoji} {towerName} — {t.towerUpgradeTitle}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedTowerId(null)}
                    style={styles.upgradePanelClose}
                    accessibilityRole="button"
                    accessibilityLabel={t.towerUpgradeDismissA11y}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.upgradePanelCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Current (boosted) stats row */}
                <View style={styles.upgradeStatsRow}>
                  <Text style={styles.upgradeStatChip}>⚔️ {boosted.damage}</Text>
                  <Text style={styles.upgradeStatChip}>🔭 {boosted.range.toFixed(1)}</Text>
                  <Text style={styles.upgradeStatChip}>⚡ {(1000 / boosted.cooldownMs).toFixed(1)}/s</Text>
                </View>

                {/* Upgrade buttons */}
                <View style={styles.upgradeBtnRow}>
                  {upgradeTypes.map((type) => {
                    const cfg = IN_LEVEL_UPGRADE_CONFIG[type];
                    const stacks = upgrades[type] ?? 0;
                    const isMaxed = stacks >= cfg.maxStacks;
                    const canAfford = hudGold >= cfg.cost;
                    const disabled = isMaxed || !canAfford;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.upgradeBtn,
                          isMaxed && styles.upgradeBtnMaxed,
                          !isMaxed && !canAfford && styles.upgradeBtnDisabled,
                        ]}
                        onPress={() => handleUpgradePurchase(type)}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={`${cfg.label} ${cfg.cost} Gold ${stacks}/${cfg.maxStacks}`}
                        accessibilityState={{ disabled }}
                        testID={`tower-upgrade-${type}`}
                      >
                        <Text style={styles.upgradeBtnEmoji}>{cfg.emoji}</Text>
                        <Text
                          style={[
                            styles.upgradeBtnLabel,
                            isMaxed && styles.upgradeBtnLabelMaxed,
                            !isMaxed && !canAfford && styles.upgradeBtnLabelDisabled,
                          ]}
                        >
                          {cfg.label}
                        </Text>
                        {isMaxed ? (
                          <Text style={styles.upgradeBtnMaxedBadge}>{t.towerUpgradeMaxed}</Text>
                        ) : (
                          <>
                            <Text
                              style={[
                                styles.upgradeBtnCost,
                                !canAfford && styles.upgradeBtnLabelDisabled,
                              ]}
                            >
                              {cfg.cost} 💰
                            </Text>
                            <Text style={styles.upgradeBtnStacks}>
                              {stacks}/{cfg.maxStacks}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })()
        ) : (
          /* ── Tower build buttons ──────────────────────────────────────── */
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.towerRow}
          >
            {towerChoices.map((type) => {
              const stats = effectiveTowerStats[type];
              const canAfford = hudGold >= stats.cost;
              const isSelected = buildTowerType === type;
              const targetLabel =
                stats.targets.length === 2
                  ? t.towerTargetAll
                  : stats.targets[0] === 'ground'
                  ? t.towerTargetGround
                  : t.towerTargetAir;
              const name =
                type === 'archer'
                  ? t.towerArcherName
                  : type === 'cannon'
                  ? t.towerCannonName
                  : t.towerMagicName;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.towerBtn,
                    isSelected && styles.towerBtnActive,
                    !canAfford && styles.towerBtnDisabled,
                  ]}
                  onPress={() => canAfford && setBuildTowerType(type)}
                  disabled={!canAfford}
                  accessibilityRole="button"
                  accessibilityLabel={`${name} ${stats.cost} Gold ${targetLabel}`}
                  accessibilityState={{ disabled: !canAfford, selected: isSelected }}
                  testID={`tower-build-${type}`}
                >
                  {isSelected && <View style={styles.towerBtnActiveDot} />}
                  <Text style={styles.towerBtnEmoji}>{stats.emoji}</Text>
                  <Text
                    style={[
                      styles.towerBtnName,
                      isSelected && styles.towerBtnNameActive,
                      !canAfford && styles.towerBtnTextDisabled,
                    ]}
                  >
                    {name}
                  </Text>
                  <Text
                    style={[
                      styles.towerBtnCost,
                      isSelected && styles.towerBtnCostActive,
                      !canAfford && styles.towerBtnTextDisabled,
                    ]}
                  >
                    {stats.cost} 💰
                  </Text>
                  <Text
                    style={[
                      styles.towerBtnTarget,
                      isSelected && styles.towerBtnTargetActive,
                    ]}
                  >
                    {targetLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Pause Menu ───────────────────────────────────────────────────── */}
      {paused && (
        <PauseMenuScreen
          onResume={() => setPaused(false)}
          onQuitToMenu={onQuitToMenu}
        />
      )}

      {/* ── Victory overlay ─────────────────────────────────────────────── */}
      {gameStatus === 'won' && (
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.panelIcon}>🏆</Text>
            <Text style={styles.panelTitle}>{t.victoryTitle}</Text>
            <View style={styles.panelDivider} />
            <Text style={styles.panelStat}>
              Enemies defeated:{' '}
              <Text style={styles.panelStatValue}>{gameRef.current.enemiesKilled}</Text>
            </Text>
            <Text style={styles.panelStat}>
              Gold remaining: <Text style={styles.panelStatValue}>{hudGold}</Text>
            </Text>
            <TouchableOpacity
              style={styles.panelBtn}
              onPress={handleRestart}
              accessibilityRole="button"
              accessibilityLabel={t.playAgainA11y}
            >
              <Text style={styles.panelBtnText}>▶ {t.playAgain}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.panelBtnSecondary}
              onPress={onQuitToMenu}
              accessibilityRole="button"
              accessibilityLabel={t.mainMenuA11y}
            >
              <Text style={styles.panelBtnSecondaryText}>{t.backToMenu}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Defeat overlay ──────────────────────────────────────────────── */}
      {gameStatus === 'lost' && (
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.panelIcon}>💀</Text>
            <Text style={styles.panelTitle}>{t.gameOverTitle}</Text>
            <View style={styles.panelDivider} />
            <Text style={styles.panelStat}>
              Enemies defeated:{' '}
              <Text style={styles.panelStatValue}>{gameRef.current.enemiesKilled}</Text>
            </Text>
            <Text style={styles.panelStat}>
              Waves survived:{' '}
              <Text style={styles.panelStatValue}>{hudWave}/{levelDifficulty.totalWaves}</Text>
            </Text>
            <TouchableOpacity
              style={styles.panelBtn}
              onPress={handleRestart}
              accessibilityRole="button"
              accessibilityLabel={t.tryAgainA11y}
            >
              <Text style={styles.panelBtnText}>↺ {t.playAgain}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.panelBtnSecondary}
              onPress={onQuitToMenu}
              accessibilityRole="button"
              accessibilityLabel={t.mainMenuA11y}
            >
              <Text style={styles.panelBtnSecondaryText}>{t.backToMenu}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1017' },
  safeArea: { backgroundColor: '#131825' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#131825',
  },
  waveBadge: {
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    alignItems: 'center',
    minWidth: 72,
  },
  waveLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#f5c842',
    letterSpacing: 1.5,
  },
  waveValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f5c842',
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statIcon: { fontSize: 13 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#d8e8f0' },
  pauseButton: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButtonText: { fontSize: 16, color: '#d8e8f0' },

  footer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 14,
    backgroundColor: '#131825',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  // ── Tower-type build buttons ──────────────────────────────────────────────
  towerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
  },
  towerBtn: {
    flex: 1,
    minWidth: 90,
    backgroundColor: '#0e2a1f',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3dba78',
    alignItems: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  towerBtnActive: {
    backgroundColor: '#173929',
    borderColor: '#f5c842',
    shadowColor: '#f5c842',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  towerBtnDisabled: {
    backgroundColor: '#111b2d',
    borderColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  towerBtnActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#f5c842',
  },
  towerBtnEmoji: { fontSize: 22 },
  towerBtnName: { fontSize: 11, fontWeight: '700', color: '#d8e8f0', letterSpacing: 0.3 },
  towerBtnNameActive: { color: '#fff6d2' },
  towerBtnCost: { fontSize: 12, fontWeight: '600', color: '#f5c842' },
  towerBtnCostActive: { color: '#ffe08a' },
  towerBtnTarget: { fontSize: 10, color: '#5a7080', marginTop: 1 },
  towerBtnTargetActive: { color: '#cfe9dc' },
  towerBtnTextDisabled: { color: '#3a4858' },

  // ── In-level upgrade panel ────────────────────────────────────────────────
  upgradePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  upgradePanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c8d8e8',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  upgradePanelClose: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  upgradePanelCloseText: { fontSize: 13, color: '#8a9db8' },
  upgradeStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  upgradeStatChip: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8fe0c0',
    backgroundColor: 'rgba(143,224,192,0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  upgradeBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  upgradeBtn: {
    flex: 1,
    backgroundColor: '#0e2233',
    borderWidth: 1,
    borderColor: '#2d6a9f',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 2,
    minHeight: 70,
    justifyContent: 'center',
  },
  upgradeBtnMaxed: {
    backgroundColor: '#1a2812',
    borderColor: '#4caf50',
  },
  upgradeBtnDisabled: {
    opacity: 0.45,
  },
  upgradeBtnEmoji: { fontSize: 20 },
  upgradeBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d8e8f0',
    letterSpacing: 0.3,
  },
  upgradeBtnLabelMaxed: { color: '#81c784' },
  upgradeBtnLabelDisabled: { color: '#3a4858' },
  upgradeBtnCost: { fontSize: 11, fontWeight: '600', color: '#f5c842' },
  upgradeBtnStacks: { fontSize: 10, color: '#5a7080' },
  upgradeBtnMaxedBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#81c784',
    letterSpacing: 0.8,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,8,18,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: '#131825',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: 300,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.4)',
  },
  panelIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f5c842',
    letterSpacing: 2,
    marginBottom: 14,
  },
  panelDivider: {
    width: 40,
    height: 2,
    backgroundColor: '#f5c842',
    borderRadius: 1,
    opacity: 0.4,
    marginBottom: 16,
  },
  panelStat: {
    fontSize: 14,
    color: '#5a7080',
    marginBottom: 6,
  },
  panelStatValue: {
    fontWeight: '700',
    color: '#b0c8d8',
  },
  panelBtn: {
    backgroundColor: '#f5c842',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  panelBtnText: { fontSize: 17, fontWeight: '800', color: '#0d1017', letterSpacing: 0.5 },
  panelBtnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(160,176,200,0.25)',
    borderRadius: 12,
  },
  panelBtnSecondaryText: { fontSize: 15, color: '#5a7080' },
  debugBadge: {
    position: 'absolute',
    left: 8,
    top: 68,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderColor: '#4b5f76',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  debugText: {
    fontSize: 11,
    color: '#c8d6e5',
    fontWeight: '600',
  },
  debugError: {
    marginTop: 2,
    fontSize: 10,
    color: '#ff8f8f',
    maxWidth: 260,
  },
});
