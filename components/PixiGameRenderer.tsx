/**
 * PixiGameRenderer (legacy name)
 *
 * Fallback renderer implemented with plain React Native Views.
 * Keeps the same public API so GameScreen does not need to change.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import {
  GRID_COLS,
  GRID_ROWS,
  PATH_ROW,
  TOWER_COST,
  TOWER_RANGE,
} from './game/constants';
import type { GameState } from './game/types';

// ── Kenney enemy sprites (CC-0 pixel art, 32×32 RGBA PNG) ──────────────────
const DEFAULT_ENEMY_TYPE = 'goblin' as const;
const ENEMY_SPRITES = {
  goblin:   require('../assets/enemies/goblin.png'),
  orc:      require('../assets/enemies/orc.png'),
  skeleton: require('../assets/enemies/skeleton.png'),
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
  /** Whether build-mode cell highlights should be shown. */
  buildMode: boolean;
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
  towerCell: '#0a2018',
  buildHighlight: '#0d3020',
  tower: '#3dba78',
  towerRing: '#2a9060',
  towerAccent: '#f5c842',
  hpFull: '#4ade80',
  hpLow: '#fb923c',
  hpEmpty: '#ef4444',
  hpBg: '#111827',
};

export default function PixiGameRenderer({
  onTick,
  onCellPress,
  gameStateRef,
  running,
  buildMode,
  onDiagnosticsChange,
}: Props) {
  const dimsRef = useRef({ width: 0, height: 0, cellW: 0, cellH: 0 });
  const [dims, setDims] = useState(dimsRef.current);
  const [frameVersion, setFrameVersion] = useState(0);
  const runningRef = useRef(running);
  runningRef.current = running;
  const buildModeRef = useRef(buildMode);
  buildModeRef.current = buildMode;
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
      // eslint-disable-next-line no-console
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
            // eslint-disable-next-line no-console
            console.info('[PixiGameRenderer] frame heartbeat', { frameCount });
          }
          setFrameVersion((v) => v + 1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          emitDiagnostics({ lastError: message });
          if (__DEV__) {
            // eslint-disable-next-line no-console
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
    const next = {
      width,
      height,
      cellW: width / GRID_COLS,
      cellH: height / GRID_ROWS,
    };
    dimsRef.current = next;
    setDims(next);
  }, []);
  const state = gameStateRef.current;

  const cells = useMemo(() => {
    const list: Array<{ key: string; x: number; y: number; color: string }> = [];
    const towerSet = new Set(state.towers.map((t) => `${t.row},${t.col}`));
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const key = `${r}-${c}`;
        let color = C.cell;
        if (r === PATH_ROW) {
          color = C.pathRow;
        } else if (towerSet.has(`${r},${c}`)) {
          color = C.towerCell;
        } else if (
          buildModeRef.current &&
          r !== PATH_ROW &&
          state.gold >= TOWER_COST &&
          !towerSet.has(`${r},${c}`)
        ) {
          color = C.buildHighlight;
        }
        list.push({ key, x: c * dims.cellW, y: r * dims.cellH, color });
      }
    }
    return list;
    // frameVersion keeps this derived data in sync with ref-based game updates.
  }, [dims.cellH, dims.cellW, frameVersion, state.gold, state.towers]);

  // ── Touch → cell coord conversion ────────────────────────────────────────
  const handleTouch = useCallback(
    (event: {
      nativeEvent: { locationX: number; locationY: number };
    }) => {
      const { locationX, locationY } = event.nativeEvent;
      const { cellW, cellH } = dimsRef.current;
      if (cellW === 0 || cellH === 0) return;
      const col = Math.floor(locationX / cellW);
      const row = Math.floor(locationY / cellH);
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        onCellPress(row, col);
      }
    },
    [onCellPress]
  );

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={StyleSheet.absoluteFill}>
        {cells.map((cell) => (
          <View
            key={cell.key}
            pointerEvents="none"
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
          const cx = tower.col * dims.cellW + dims.cellW / 2;
          const cy = tower.row * dims.cellH + dims.cellH / 2;
          const r = Math.min(dims.cellW, dims.cellH) * 0.35;
          const ringR = r + 3;
          return (
            <React.Fragment key={`tower-${tower.id}`}>
              {/* Outer ring */}
              <View
                pointerEvents="none"
                style={[
                  styles.tower,
                  {
                    left: cx - ringR,
                    top: cy - ringR,
                    width: ringR * 2,
                    height: ringR * 2,
                    borderRadius: ringR,
                    borderWidth: 1.5,
                    borderColor: C.towerRing,
                    backgroundColor: 'transparent',
                  },
                ]}
              />
              {/* Main body */}
              <View
                pointerEvents="none"
                style={[
                  styles.tower,
                  {
                    left: cx - r,
                    top: cy - r,
                    width: r * 2,
                    height: r * 2,
                    borderRadius: r,
                    backgroundColor: C.tower,
                  },
                ]}
              />
              {/* Accent dot */}
              <View
                pointerEvents="none"
                style={[
                  styles.tower,
                  {
                    left: cx - r * 0.38,
                    top: cy - r * 0.38,
                    width: r * 0.76,
                    height: r * 0.76,
                    borderRadius: r * 0.38,
                    backgroundColor: C.towerAccent,
                  },
                ]}
              />
            </React.Fragment>
          );
        })}

        {state.enemies.map((enemy) => {
          const pathY = PATH_ROW * dims.cellH;
          const padding = dims.cellH * 0.1;
          const enemyH = dims.cellH * 0.6;
          const hpBarH = 5;
          const hpBarY = pathY + padding + enemyH + 3;
          const x = enemy.col * dims.cellW + padding;
          const w = dims.cellW - padding * 2;
          const hpRatio = Math.max(0, enemy.health / enemy.maxHealth);
          const hpColor = hpRatio > 0.5 ? C.hpFull : hpRatio > 0.25 ? C.hpLow : C.hpEmpty;
          const sprite = ENEMY_SPRITES[enemy.enemyType ?? DEFAULT_ENEMY_TYPE];

          return (
            <React.Fragment key={`enemy-${enemy.id}`}>
              <Image
                source={sprite}
                pointerEvents="none"
                style={[
                  styles.enemy,
                  {
                    left: x,
                    top: pathY + padding,
                    width: w,
                    height: enemyH,
                  },
                ]}
                resizeMode="contain"
              />
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

      <Pressable style={StyleSheet.absoluteFill} onPress={handleTouch} />
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
  enemy: {
    position: 'absolute',
  },
  hpBar: {
    position: 'absolute',
    borderRadius: 3,
  },
});
