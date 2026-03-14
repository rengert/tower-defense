/**
 * PixiGameRenderer (legacy name)
 *
 * Native-safe renderer implemented with React Native Skia.
 * Keeps the same public API so GameScreen does not need to change.
 */
import { Canvas, Circle, Line, Rect, RoundedRect } from '@shopify/react-native-skia';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import {
  GRID_COLS,
  GRID_ROWS,
  PATH_ROW,
  TOWER_COST,
  TOWER_RANGE,
} from './game/constants';
import type { GameState } from './game/types';

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
  bg: '#0a0a1a',
  gridLine: '#0a0a2a',
  cell: '#1e2d3d',
  pathRow: '#5a4a3a',
  towerCell: '#1a3a2e',
  buildHighlight: '#1e4a2a',
  tower: '#40c080',
  towerAccent: '#f0c040',
  towerRange: '#40c080',
  enemy: '#e04040',
  hpFull: '#40e040',
  hpLow: '#f08020',
  hpEmpty: '#e04040',
  pathArrow: '#7a6a5a',
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
      console.info('[PixiGameRenderer] Skia renderer ready');
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
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={dims.width} height={dims.height} color={C.bg} />

        {cells.map((cell) => (
          <React.Fragment key={cell.key}>
            <Rect
              x={cell.x}
              y={cell.y}
              width={dims.cellW}
              height={dims.cellH}
              color={cell.color}
            />
            <Rect
              x={cell.x}
              y={cell.y}
              width={dims.cellW}
              height={dims.cellH}
              color={C.gridLine}
              style="stroke"
              strokeWidth={0.5}
            />
          </React.Fragment>
        ))}

        {Array.from({ length: GRID_COLS - 2 }).map((_, i) => {
          const c = i + 1;
          if (c % 2 === 0) return null;
          const arrowY = PATH_ROW * dims.cellH + dims.cellH / 2;
          const ax = c * dims.cellW + dims.cellW * 0.3;
          return (
            <React.Fragment key={`arrow-${c}`}>
              <Line
                p1={{ x: ax, y: arrowY - dims.cellH * 0.15 }}
                p2={{ x: ax + dims.cellW * 0.3, y: arrowY }}
                color={C.pathArrow}
                strokeWidth={1}
              />
              <Line
                p1={{ x: ax + dims.cellW * 0.3, y: arrowY }}
                p2={{ x: ax, y: arrowY + dims.cellH * 0.15 }}
                color={C.pathArrow}
                strokeWidth={1}
              />
            </React.Fragment>
          );
        })}

        {state.towers.map((tower) => {
          const cx = tower.col * dims.cellW + dims.cellW / 2;
          const cy = tower.row * dims.cellH + dims.cellH / 2;
          const r = Math.min(dims.cellW, dims.cellH) * 0.35;
          return (
            <React.Fragment key={`tower-${tower.id}`}>
              <Circle cx={cx} cy={cy} r={r} color={C.tower} />
              <Circle cx={cx} cy={cy} r={r * 0.45} color={C.towerAccent} />
              {buildMode && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={TOWER_RANGE * dims.cellW}
                  color={C.towerRange}
                  style="stroke"
                  strokeWidth={1}
                  opacity={0.3}
                />
              )}
            </React.Fragment>
          );
        })}

        {state.enemies.map((enemy) => {
          const pathY = PATH_ROW * dims.cellH;
          const padding = dims.cellH * 0.1;
          const enemyH = dims.cellH * 0.55;
          const hpBarH = 4;
          const hpBarY = pathY + padding + enemyH + 2;
          const x = enemy.col * dims.cellW + padding;
          const w = dims.cellW - padding * 2;
          const hpRatio = Math.max(0, enemy.health / enemy.maxHealth);
          const hpColor =
            hpRatio > 0.5 ? C.hpFull : hpRatio > 0.25 ? C.hpLow : C.hpEmpty;

          return (
            <React.Fragment key={`enemy-${enemy.id}`}>
              <RoundedRect x={x} y={pathY + padding} width={w} height={enemyH} r={2} color={C.enemy} />
              <RoundedRect x={x} y={hpBarY} width={w} height={hpBarH} r={2} color="#333333" />
              {hpRatio > 0 && (
                <RoundedRect
                  x={x}
                  y={hpBarY}
                  width={w * hpRatio}
                  height={hpBarH}
                  r={2}
                  color={hpColor}
                />
              )}
            </React.Fragment>
          );
        })}
      </Canvas>

      <Pressable style={StyleSheet.absoluteFill} onPress={handleTouch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
});
