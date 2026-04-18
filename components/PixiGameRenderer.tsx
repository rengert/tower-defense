/**
 * PixiGameRenderer (legacy name)
 *
 * Fallback renderer implemented with plain React Native Views.
 * Keeps the same public API so GameScreen does not need to change.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import {
  AIR_ROW,
  GRID_COLS,
  GRID_ROWS,
  PATH_ROW,
  TOWER_STATS,
} from './game/constants';
import { findShortestPath } from './game/logic';
import type { GameState, TowerType } from './game/types';

// ── Kenney enemy sprites – air variants reuse ground sprites with visual tint ─
const DEFAULT_ENEMY_TYPE = 'goblin' as const;
const ENEMY_SPRITES = {
  goblin:   require('../assets/enemies/goblin.png'),
  orc:      require('../assets/enemies/orc.png'),
  skeleton: require('../assets/enemies/skeleton.png'),
  harpy:    require('../assets/enemies/goblin.png'),   // reuse goblin sprite
  wyvern:   require('../assets/enemies/orc.png'),      // reuse orc sprite
  specter:  require('../assets/enemies/skeleton.png'), // reuse skeleton sprite
} as const;

// ── Kenney tower sprites (CC-0 pixel art, 32×32 RGBA PNG) ──────────────────
const DEFAULT_TOWER_TYPE = 'archer' as const;
const TOWER_SPRITES = {
  archer: require('../assets/towers/archer.png'),
  cannon: require('../assets/towers/cannon.png'),
  magic:  require('../assets/towers/magic.png'),
} as const;

interface Props {
  /** Called on every game-loop tick so the parent can update HUD / overlay state. */
  onTick: (dtMs: number) => void;
  /** Called when the player taps a grid cell in build mode. */
  onCellPress: (row: number, col: number) => void;
  /** Live reference to the game state (read each frame – never triggers re-render). */
  gameStateRef: React.MutableRefObject<GameState>;
  /** Whether the game loop should be running. */
  running: boolean;
  /**
   * The tower type the player has selected to build, or null when not in build mode.
   * Controls cell highlight colour and the tower that gets placed on tap.
   */
  buildTowerType: TowerType | null;
  /** Emits renderer diagnostics so native black-screen issues are visible in UI/logs. */
  onDiagnosticsChange: (diag: RenderDiagnostics) => void;
}

export interface RenderDiagnostics {
  glReady: boolean;
  rendererReady: boolean;
  frameCount: number;
  lastFrameMs: number | null;
  lastError: string | null;
}

const INITIAL_DIAGNOSTICS: RenderDiagnostics = {
  glReady: false,
  rendererReady: false,
  frameCount: 0,
  lastFrameMs: null,
  lastError: null,
};

// ── Colors ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#0d1017',
  gridLine: '#182030',
  cell: '#111b2d',
  pathRow: '#2a2010',
  airRow: '#0d1a2a',    // subtle blue tint for the air lane
  towerCell: '#0a2018',
  buildHighlight: '#0d3020',
  hpFull: '#4ade80',
  hpLow: '#fb923c',
  hpEmpty: '#ef4444',
  hpBg: '#111827',
  airHpFull: '#38bdf8',  // sky-blue HP for air enemies
  airHpLow: '#7dd3fc',
};

export default function PixiGameRenderer({
  onTick,
  onCellPress,
  gameStateRef,
  running,
  buildTowerType,
  onDiagnosticsChange,
}: Props) {
  const dimsRef = useRef({ width: 0, height: 0, cellW: 0, cellH: 0, offsetX: 0, offsetY: 0 });
  const [dims, setDims] = useState(dimsRef.current);
  const [frameVersion, setFrameVersion] = useState(0);
  const runningRef = useRef(running);
  runningRef.current = running;
  const buildTowerTypeRef = useRef(buildTowerType);
  buildTowerTypeRef.current = buildTowerType;
  // Keep onTick stable in the ticker closure via a ref so stale captures are avoided.
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const onDiagnosticsChangeRef = useRef(onDiagnosticsChange);
  onDiagnosticsChangeRef.current = onDiagnosticsChange;
  const diagRef = useRef<RenderDiagnostics>(INITIAL_DIAGNOSTICS);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const lastTickMsRef = useRef<number | null>(null);

  const emitDiagnostics = useCallback((patch: Partial<RenderDiagnostics>) => {
    const next = { ...diagRef.current, ...patch };
    diagRef.current = next;
    onDiagnosticsChangeRef.current(next);
  }, []);

  useEffect(() => {
    emitDiagnostics(INITIAL_DIAGNOSTICS);

    if (__DEV__) {
      console.info('[PixiGameRenderer] RN fallback renderer ready');
    }
    emitDiagnostics({ glReady: true, rendererReady: true, lastError: null });

    const frame = (now: number) => {
      if (!mountedRef.current) return;

      if (runningRef.current) {
        const last = lastTickMsRef.current ?? now;
        const dtMs = Math.max(0, now - last);
        lastTickMsRef.current = now;

        try {
          onTickRef.current(dtMs);
          const frameCount = diagRef.current.frameCount + 1;
          emitDiagnostics({ frameCount, lastFrameMs: Date.now(), lastError: null });
          if (__DEV__ && frameCount % 120 === 0) {
            console.info('[PixiGameRenderer] frame heartbeat', { frameCount });
          }
          setFrameVersion((v) => v + 1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          emitDiagnostics({ lastError: message });
          if (__DEV__) {
            console.error('[PixiGameRenderer] render error', error);
          }
        }
      } else {
        lastTickMsRef.current = null;
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      mountedRef.current = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [emitDiagnostics]);

  // ── Compute cell dimensions ──────────────────────────────────────────────
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    // Use a uniform cell size so every cell is a perfect square.
    const cellSize = Math.min(width / GRID_COLS, height / GRID_ROWS);
    const gridW = cellSize * GRID_COLS;
    const gridH = cellSize * GRID_ROWS;
    const next = {
      width,
      height,
      cellW: cellSize,
      cellH: cellSize,
      offsetX: (width - gridW) / 2,
      offsetY: (height - gridH) / 2,
    };
    dimsRef.current = next;
    setDims(next);
  }, []);
  const state = gameStateRef.current;

  const cells = useMemo(() => {
    const list: { key: string; x: number; y: number; color: string }[] = [];
    const towerSet = new Set(state.towers.map((t) => `${t.row},${t.col}`));
    const currentPath = findShortestPath(state.towers);
    const pathSet = currentPath
      ? new Set(currentPath.map((point) => `${point.row},${point.col}`))
      : new Set<string>();
    const inBuildMode = buildTowerType !== null &&
      state.gold >= TOWER_STATS[buildTowerType].cost;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const key = `${r}-${c}`;
        let color = C.cell;
        if (towerSet.has(`${r},${c}`)) {
          color = C.towerCell;
        } else if (inBuildMode) {
          color = C.buildHighlight;
        } else if (r === AIR_ROW) {
          color = C.airRow;
        } else if (pathSet.has(`${r},${c}`)) {
          color = C.pathRow;
        }
        list.push({ key, x: dims.offsetX + c * dims.cellW, y: dims.offsetY + r * dims.cellH, color });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildTowerType, dims.cellH, dims.cellW, dims.offsetX, dims.offsetY, frameVersion, state.gold, state.towers]);

  // Keep a ref so the responder callbacks always use the latest onCellPress
  // without needing to re-register the responder on every render.
  const onCellPressRef = useRef(onCellPress);
  onCellPressRef.current = onCellPress;

  // ── Touch → cell coord conversion ────────────────────────────────────────
  const handleTouchStart = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      const { locationX, locationY } = event.nativeEvent;
      const { cellW, cellH } = dimsRef.current;
      if (__DEV__) {
        console.info('[PixiGameRenderer] touch', {
          locationX,
          locationY,
          cellW,
          cellH,
          buildTowerType: buildTowerTypeRef.current,
        });
      }
      if (cellW === 0 || cellH === 0) return;
      const { offsetX, offsetY } = dimsRef.current;
      const col = Math.floor((locationX - offsetX) / cellW);
      const row = Math.floor((locationY - offsetY) / cellH);
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        onCellPressRef.current(row, col);
      }
    },
    [] // stable – reads only refs
  );

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={StyleSheet.absoluteFill}>
        {cells.map((cell) => (
          <View
            key={cell.key}
            style={[
              styles.cell,
              {
                left: cell.x,
                top: cell.y,
                width: dims.cellW,
                height: dims.cellH,
                backgroundColor: cell.color,
                borderColor: C.gridLine,
              },
            ]}
          />
        ))}

        {state.towers.map((tower) => {
          const padding = dims.cellH * 0.05;
          const x = dims.offsetX + tower.col * dims.cellW + padding;
          const y = dims.offsetY + tower.row * dims.cellH + padding;
          const w = dims.cellW - padding * 2;
          const h = dims.cellH - padding * 2;
          const towerType = tower.towerType ?? DEFAULT_TOWER_TYPE;
          const sprite = TOWER_SPRITES[towerType];
          const towerEmoji = TOWER_STATS[towerType].emoji;
          return (
            <React.Fragment key={`tower-${tower.id}`}>
              <Image
                source={sprite}
                style={[
                  styles.tower,
                  {
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                  },
                ]}
                resizeMode="contain"
              />
              <View
                pointerEvents="none"
                style={[
                  styles.towerBadge,
                  {
                    left: x + w - dims.cellW * 0.26,
                    top: y - dims.cellH * 0.03,
                    width: dims.cellW * 0.24,
                    height: dims.cellW * 0.24,
                  },
                ]}
              >
                <Text style={styles.towerBadgeText}>{towerEmoji}</Text>
              </View>
            </React.Fragment>
          );
        })}

        {state.enemies.map((enemy) => {
          const isAirEnemy = (enemy.category ?? 'ground') === 'air';
          const pathY = dims.offsetY + (enemy.row ?? PATH_ROW) * dims.cellH;
          const padding = dims.cellH * 0.1;
          const enemyH = dims.cellH * 0.6;
          const hpBarH = 5;
          const hpBarY = pathY + padding + enemyH + 3;
          const x = dims.offsetX + enemy.col * dims.cellW + padding;
          const w = dims.cellW - padding * 2;
          const hpRatio = Math.max(0, enemy.health / enemy.maxHealth);
          const hpColor = isAirEnemy
            ? hpRatio > 0.5
              ? C.airHpFull
              : hpRatio > 0.25
                ? C.airHpLow
                : C.hpEmpty
            : hpRatio > 0.5
              ? C.hpFull
              : hpRatio > 0.25
                ? C.hpLow
                : C.hpEmpty;
          const sprite = ENEMY_SPRITES[enemy.enemyType ?? DEFAULT_ENEMY_TYPE];

          return (
            <React.Fragment key={`enemy-${enemy.id}`}>
              <Image
                source={sprite}
                style={[
                  styles.enemy,
                  isAirEnemy && styles.enemyAir,
                  {
                    left: x,
                    top: pathY + padding,
                    width: w,
                    height: enemyH,
                  },
                ]}
                resizeMode="contain"
              />
              {isAirEnemy && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.enemyBadge,
                    {
                      left: x - dims.cellW * 0.03,
                      top: pathY + padding - dims.cellH * 0.08,
                    },
                  ]}
                >
                  <Text style={styles.enemyBadgeText}>✈</Text>
                </View>
              )}
              <View
                pointerEvents="none"
                style={[
                  styles.hpBar,
                  { left: x, top: hpBarY, width: w, height: hpBarH, backgroundColor: C.hpBg },
                ]}
              />
              {hpRatio > 0 && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.hpBar,
                    {
                      left: x,
                      top: hpBarY,
                      width: w * hpRatio,
                      height: hpBarH,
                      backgroundColor: hpColor,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1017',
  },
  cell: {
    position: 'absolute',
    borderWidth: 0.5,
  },
  tower: {
    position: 'absolute',
  },
  towerBadge: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(10,16,23,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  towerBadgeText: {
    fontSize: 10,
  },
  enemy: {
    position: 'absolute',
  },
  enemyAir: {
    opacity: 0.92,
    tintColor: '#c7f0ff',
  },
  enemyBadge: {
    position: 'absolute',
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(14, 165, 233, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enemyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#06131d',
  },
  hpBar: {
    position: 'absolute',
    borderRadius: 3,
  },
});
