import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from './i18n/LanguageContext';
import PixiGameRenderer, { type RenderDiagnostics } from './PixiGameRenderer';
import PauseMenuScreen from './PauseMenuScreen';
import { TOTAL_WAVES, TOWER_COST } from './game/constants';
import { createInitialState, placeTower, tickGame } from './game/logic';
import type { GameState, GameStatus } from './game/types';

interface Props {
  onQuitToMenu: () => void;
}

export default function GameScreen({ onQuitToMenu }: Props) {
  const { t } = useLanguage();
  const [paused, setPaused] = useState(false);
  const [buildMode, setBuildMode] = useState(false);

  // ── Shared game state ──────────────────────────────────────────────────────
  // Game state lives in a ref so the PixiJS ticker can read it without causing
  // React re-renders on every frame. HUD-visible values are mirrored into React
  // state and updated whenever they change.
  const gameRef = useRef<GameState>(createInitialState());
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

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

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

  // ── Game tick (called by PixiGameRenderer on every animation frame) ────────
  const handleTick = useCallback(
    (dtMs: number) => {
      if (pausedRef.current) return;
      const prev = gameRef.current;
      const next = tickGame(prev, dtMs);
      gameRef.current = next;
      syncHudState(prev, next);
    },
    [syncHudState]
  );

  // ── Tower placement ───────────────────────────────────────────────────────
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (!buildMode || gameRef.current.status !== 'playing') return;
      const prev = gameRef.current;
      const next = placeTower(prev, row, col);
      if (next !== prev) {
        gameRef.current = next;
        setBuildMode(false);
        syncHudState(prev, next);
      }
    },
    [buildMode, syncHudState]
  );

  // ── Restart ───────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    const prev = gameRef.current;
    const fresh = createInitialState();
    gameRef.current = fresh;
    setBuildMode(false);
    syncHudState(prev, fresh);
  }, [syncHudState]);

  const isPlaying = gameStatus === 'playing';

  return (
    <View style={styles.container}>
      {/* ── Header HUD ──────────────────────────────────────────────────── */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.waveBadge}>
            <Text style={styles.waveLabel}>{t.wave}</Text>
            <Text style={styles.waveValue}>{hudWave}/{TOTAL_WAVES}</Text>
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
            accessibilityLabel="Pause game"
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
        buildMode={buildMode}
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

      {/* ── Footer – Build Controls ──────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.buildBtn, buildMode && styles.buildBtnActive]}
          onPress={() => setBuildMode((m) => !m)}
          accessibilityRole="button"
          accessibilityLabel={buildMode ? 'Cancel build' : 'Build tower'}
        >
          <Text style={styles.buildBtnText}>
            {buildMode ? t.cancelBuild : `${t.buildTower} · ${TOWER_COST} 💰`}
          </Text>
        </TouchableOpacity>
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
              accessibilityLabel="Play Again"
            >
              <Text style={styles.panelBtnText}>▶ Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.panelBtnSecondary}
              onPress={onQuitToMenu}
              accessibilityRole="button"
              accessibilityLabel="Main Menu"
            >
              <Text style={styles.panelBtnSecondaryText}>Main Menu</Text>
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
              <Text style={styles.panelStatValue}>{hudWave}/{TOTAL_WAVES}</Text>
            </Text>
            <TouchableOpacity
              style={styles.panelBtn}
              onPress={handleRestart}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.panelBtnText}>↺ Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.panelBtnSecondary}
              onPress={onQuitToMenu}
              accessibilityRole="button"
              accessibilityLabel="Main Menu"
            >
              <Text style={styles.panelBtnSecondaryText}>Main Menu</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: '#131825',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  buildBtn: {
    backgroundColor: '#0e2a1f',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3dba78',
    alignItems: 'center',
  },
  buildBtnActive: {
    backgroundColor: '#2a1010',
    borderColor: '#ef4444',
  },
  buildBtnText: { fontSize: 15, fontWeight: '700', color: '#d8e8f0', letterSpacing: 0.5 },

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
