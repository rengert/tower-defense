import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PixiGameRenderer, { type RenderDiagnostics } from './PixiGameRenderer';
import PauseMenuScreen from './PauseMenuScreen';
import { TOTAL_WAVES, TOWER_COST } from './game/constants';
import { createInitialState, placeTower, tickGame } from './game/logic';
import type { GameState, GameStatus } from './game/types';

interface Props {
  onQuitToMenu: () => void;
}

export default function GameScreen({ onQuitToMenu }: Props) {
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
          <Text style={styles.waveText}>
            Wave {hudWave}/{TOTAL_WAVES}
          </Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>❤️ {hudLives}</Text>
            <Text style={styles.stat}>💰 {hudGold}</Text>
          </View>
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={() => setPaused(true)}
            accessibilityRole="button"
            accessibilityLabel="Pause game"
          >
            <Text style={styles.pauseButtonText}>⏸ Pause</Text>
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
            {buildMode ? '✕ Cancel' : `🗼 Build Tower (${TOWER_COST} 💰)`}
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
            <Text style={styles.panelTitle}>🏆 You Win!</Text>
            <Text style={styles.panelStat}>
              Enemies defeated: {gameRef.current.enemiesKilled}
            </Text>
            <Text style={styles.panelStat}>Gold remaining: {hudGold}</Text>
            <TouchableOpacity
              style={styles.panelBtn}
              onPress={handleRestart}
              accessibilityRole="button"
              accessibilityLabel="Play Again"
            >
              <Text style={styles.panelBtnText}>Play Again</Text>
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
            <Text style={styles.panelTitle}>💀 Game Over</Text>
            <Text style={styles.panelStat}>
              Enemies defeated: {gameRef.current.enemiesKilled}
            </Text>
            <Text style={styles.panelStat}>
              Waves survived: {hudWave}/{TOTAL_WAVES}
            </Text>
            <TouchableOpacity
              style={styles.panelBtn}
              onPress={handleRestart}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.panelBtnText}>Try Again</Text>
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
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  safeArea: { backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a2e',
  },
  waveText: { fontSize: 15, fontWeight: 'bold', color: '#f0c040', minWidth: 70 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { fontSize: 14, color: '#f0f0f0', fontWeight: '600' },
  pauseButton: {
    backgroundColor: '#f0c040',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  pauseButtonText: { fontSize: 14, fontWeight: 'bold', color: '#0a0a1a' },

  footer: {
    padding: 12,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  buildBtn: {
    backgroundColor: '#2a4a3e',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#40c080',
  },
  buildBtnActive: {
    backgroundColor: '#4a2a2a',
    borderColor: '#c04040',
  },
  buildBtnText: { fontSize: 15, fontWeight: 'bold', color: '#f0f0f0' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    width: 280,
    borderWidth: 2,
    borderColor: '#f0c040',
  },
  panelTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f0c040',
    marginBottom: 12,
  },
  panelStat: {
    fontSize: 15,
    color: '#a0b8d0',
    marginBottom: 6,
  },
  panelBtn: {
    backgroundColor: '#f0c040',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 18,
    width: '100%',
    alignItems: 'center',
  },
  panelBtnText: { fontSize: 17, fontWeight: 'bold', color: '#0a0a1a' },
  panelBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a0b8d0',
    borderRadius: 8,
  },
  panelBtnSecondaryText: { fontSize: 16, color: '#a0b8d0' },
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
