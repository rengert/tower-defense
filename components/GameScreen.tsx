import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PauseMenuScreen from './PauseMenuScreen';
import { GRID_COLS, GRID_ROWS, PATH_ROW, TICK_MS, TOTAL_WAVES, TOWER_COST } from './game/constants';
import { canPlaceTower, createInitialState, placeTower, tickGame } from './game/logic';
import type { GameState, GameStatus } from './game/types';

interface Props {
  onQuitToMenu: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width || 375;
const CELL_SIZE = Math.max(10, Math.floor(SCREEN_WIDTH / GRID_COLS));
const BOARD_WIDTH = CELL_SIZE * GRID_COLS;
const BOARD_HEIGHT = CELL_SIZE * GRID_ROWS;

export default function GameScreen({ onQuitToMenu }: Props) {
  const [paused, setPaused] = useState(false);
  const [buildMode, setBuildMode] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');

  const gameRef = useRef<GameState>(createInitialState());
  // Increment to trigger a re-render without moving all game state to React.
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (paused || gameStatus !== 'playing') return;

    const id = setInterval(() => {
      const next = tickGame(gameRef.current);
      gameRef.current = next;
      if (next.status !== 'playing') {
        setGameStatus(next.status);
      } else {
        forceUpdate();
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [paused, gameStatus]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (!buildMode || gameRef.current.status !== 'playing') return;
      const next = placeTower(gameRef.current, row, col);
      if (next !== gameRef.current) {
        gameRef.current = next;
        setBuildMode(false);
        forceUpdate();
      }
    },
    [buildMode]
  );

  const handleRestart = useCallback(() => {
    gameRef.current = createInitialState();
    setBuildMode(false);
    setGameStatus('playing');
  }, []);

  // ── Rendering helpers ─────────────────────────────────────────────────────
  const game = gameRef.current;

  // O(1) tower position lookup — recomputed once per render, not per cell.
  const towerPositions = new Set(
    game.towers.map((t) => `${t.row},${t.col}`)
  );

  const getCellBg = (row: number, col: number): string => {
    if (row === PATH_ROW) return '#5a4a3a';
    if (towerPositions.has(`${row},${col}`)) return '#1a3a2e';
    if (buildMode && canPlaceTower(game, row, col)) return '#1e3a28';
    return '#1e2d3d';
  };

  return (
    <View style={styles.container}>
      {/* ── Header HUD ─────────────────────────────────────────────────── */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.waveText}>
            Wave {game.wave}/{TOTAL_WAVES}
          </Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>❤️ {game.lives}</Text>
            <Text style={styles.stat}>💰 {game.gold}</Text>
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

      {/* ── Game Board ─────────────────────────────────────────────────── */}
      <View style={styles.boardWrapper}>
        <View
          style={[
            styles.board,
            { width: BOARD_WIDTH, height: BOARD_HEIGHT },
          ]}
        >
          {/* Grid cells */}
          {Array.from({ length: GRID_ROWS }, (_, row) => (
            <View
              key={row}
              style={[styles.gridRow, { top: row * CELL_SIZE }]}
            >
              {Array.from({ length: GRID_COLS }, (_, col) => (
                <TouchableOpacity
                  key={col}
                  style={[
                    styles.cell,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: getCellBg(row, col),
                    },
                  ]}
                  onPress={() => handleCellPress(row, col)}
                  activeOpacity={
                    buildMode && row !== PATH_ROW ? 0.6 : 1
                  }
                  accessibilityLabel={`Cell row ${row} col ${col}`}
                >
                  {towerPositions.has(`${row},${col}`) && (
                    <Text
                      style={{ fontSize: CELL_SIZE * 0.55, lineHeight: CELL_SIZE }}
                    >
                      🗼
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Enemies (absolute overlay) */}
          {game.enemies.map((enemy) => (
            <View
              key={enemy.id}
              style={[
                styles.enemy,
                {
                  left: enemy.col * CELL_SIZE + CELL_SIZE * 0.1,
                  top: PATH_ROW * CELL_SIZE + CELL_SIZE * 0.1,
                  width: CELL_SIZE * 0.8,
                  height: CELL_SIZE * 0.8,
                },
              ]}
            >
              <View
                style={[
                  styles.enemyBody,
                  { width: CELL_SIZE * 0.8, height: CELL_SIZE * 0.55 },
                ]}
              />
              {/* Health bar */}
              <View style={[styles.hpBarBg, { width: CELL_SIZE * 0.8 }]}>
                <View
                  style={[
                    styles.hpBarFg,
                    {
                      width:
                        CELL_SIZE *
                        0.8 *
                        Math.max(0, enemy.health / enemy.maxHealth),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Footer – Build Controls ─────────────────────────────────────── */}
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

      {/* ── Pause Menu ─────────────────────────────────────────────────── */}
      {paused && (
        <PauseMenuScreen
          onResume={() => setPaused(false)}
          onQuitToMenu={onQuitToMenu}
        />
      )}

      {/* ── Victory overlay ────────────────────────────────────────────── */}
      {game.status === 'won' && (
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>🏆 You Win!</Text>
            <Text style={styles.panelStat}>
              Enemies defeated: {game.enemiesKilled}
            </Text>
            <Text style={styles.panelStat}>Gold remaining: {game.gold}</Text>
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

      {/* ── Defeat overlay ─────────────────────────────────────────────── */}
      {game.status === 'lost' && (
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>💀 Game Over</Text>
            <Text style={styles.panelStat}>
              Enemies defeated: {game.enemiesKilled}
            </Text>
            <Text style={styles.panelStat}>
              Waves survived: {game.wave}/{TOTAL_WAVES}
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

  boardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a1a',
  },
  board: {
    position: 'relative',
    overflow: 'hidden',
  },
  gridRow: {
    position: 'absolute',
    flexDirection: 'row',
    left: 0,
  },
  cell: {
    borderWidth: 0.5,
    borderColor: '#0a0a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  enemy: { position: 'absolute' },
  enemyBody: {
    backgroundColor: '#e04040',
    borderRadius: 3,
  },
  hpBarBg: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 2,
  },
  hpBarFg: {
    height: 4,
    backgroundColor: '#40e040',
    borderRadius: 2,
  },

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
});
