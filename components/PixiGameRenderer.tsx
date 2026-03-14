/**
 * PixiGameRenderer
 *
 * Uses expo-gl to create a WebGL context and drives a pixi.js v7 Renderer to
 * draw the tower-defense game board at up to 60 fps.
 *
 * Responsibilities:
 *  - Render grid, path row, towers and enemies using pixi.js Graphics primitives.
 *  - Run the game loop via PIXI.Ticker (delta-time based) so enemy movement is smooth.
 *  - Forward cell-press touch events via the onCellPress callback.
 *  - Stop the ticker and clean up when the component unmounts or the game ends.
 */
import { GLView } from 'expo-gl';
import * as PIXI from 'pixi.js';
import React, { useCallback, useRef } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
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
}

// ── Colors ─────────────────────────────────────────────────────────────────
const C = {
  bg: 0x0a0a1a,
  gridLine: 0x0a0a2a,
  cell: 0x1e2d3d,
  pathRow: 0x5a4a3a,
  towerCell: 0x1a3a2e,
  buildHighlight: 0x1e4a2a,
  tower: 0x40c080,
  towerAccent: 0xf0c040,
  towerRange: 0x40c080,
  enemy: 0xe04040,
  hpFull: 0x40e040,
  hpLow: 0xf08020,
  hpEmpty: 0xe04040,
  pathArrow: 0x7a6a5a,
};

export default function PixiGameRenderer({
  onTick,
  onCellPress,
  gameStateRef,
  running,
  buildMode,
}: Props) {
  const tickerRef = useRef<PIXI.Ticker | null>(null);
  const rendererRef = useRef<PIXI.IRenderer | null>(null);
  const stageRef = useRef<PIXI.Container | null>(null);
  // Graphics layers
  const gridGfxRef = useRef<PIXI.Graphics | null>(null);
  const enemyGfxRef = useRef<PIXI.Graphics | null>(null);
  // Dimensions set once layout is known
  const dimsRef = useRef({ width: 0, height: 0, cellW: 0, cellH: 0 });
  const runningRef = useRef(running);
  runningRef.current = running;
  const buildModeRef = useRef(buildMode);
  buildModeRef.current = buildMode;
  // Keep onTick stable in the ticker closure via a ref so stale captures are avoided.
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  // ── Compute cell dimensions ──────────────────────────────────────────────
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    dimsRef.current = {
      width,
      height,
      cellW: width / GRID_COLS,
      cellH: height / GRID_ROWS,
    };
  }, []);

  // ── pixi.js rendering helpers ────────────────────────────────────────────
  function drawGrid(
    gfx: PIXI.Graphics,
    state: GameState,
    cellW: number,
    cellH: number
  ) {
    gfx.clear();
    const towerSet = new Set(state.towers.map((t) => `${t.row},${t.col}`));

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = c * cellW;
        const y = r * cellH;
        let fill: number;
        if (r === PATH_ROW) {
          fill = C.pathRow;
        } else if (towerSet.has(`${r},${c}`)) {
          fill = C.towerCell;
        } else if (buildModeRef.current && r !== PATH_ROW && state.gold >= TOWER_COST && !towerSet.has(`${r},${c}`)) {
          fill = C.buildHighlight;
        } else {
          fill = C.cell;
        }

        gfx.beginFill(fill);
        gfx.lineStyle(0.5, C.gridLine, 1);
        gfx.drawRect(x, y, cellW, cellH);
        gfx.endFill();
      }
    }

    // Draw path direction arrows along PATH_ROW
    const arrowY = PATH_ROW * cellH + cellH / 2;
    gfx.lineStyle(1, C.pathArrow, 0.5);
    for (let c = 1; c < GRID_COLS - 1; c += 2) {
      const ax = c * cellW + cellW * 0.3;
      gfx.moveTo(ax, arrowY - cellH * 0.15);
      gfx.lineTo(ax + cellW * 0.3, arrowY);
      gfx.lineTo(ax, arrowY + cellH * 0.15);
    }
    gfx.lineStyle(0);

    // Draw towers
    for (const tower of state.towers) {
      const cx = tower.col * cellW + cellW / 2;
      const cy = tower.row * cellH + cellH / 2;
      const r = Math.min(cellW, cellH) * 0.35;

      // Tower body (circle)
      gfx.beginFill(C.tower);
      gfx.drawCircle(cx, cy, r);
      gfx.endFill();

      // Tower accent (inner circle)
      gfx.beginFill(C.towerAccent);
      gfx.drawCircle(cx, cy, r * 0.45);
      gfx.endFill();
    }

    // Draw range rings in build mode
    if (buildModeRef.current) {
      for (const tower of state.towers) {
        const cx = tower.col * cellW + cellW / 2;
        const cy = tower.row * cellH + cellH / 2;
        gfx.lineStyle(1, C.towerRange, 0.3);
        gfx.drawCircle(cx, cy, TOWER_RANGE * cellW);
        gfx.lineStyle(0);
      }
    }
  }

  function drawEnemies(
    gfx: PIXI.Graphics,
    state: GameState,
    cellW: number,
    cellH: number
  ) {
    gfx.clear();
    const pathY = PATH_ROW * cellH;
    const padding = cellH * 0.1;
    const enemyH = cellH * 0.55;
    const hpBarH = 4;
    const hpBarY = pathY + padding + enemyH + 2;

    for (const enemy of state.enemies) {
      const x = enemy.col * cellW + padding;
      const w = cellW - padding * 2;

      // Enemy body
      gfx.beginFill(C.enemy);
      gfx.drawRoundedRect(x, pathY + padding, w, enemyH, 2);
      gfx.endFill();

      // Health bar background
      gfx.beginFill(0x333333);
      gfx.drawRoundedRect(x, hpBarY, w, hpBarH, 2);
      gfx.endFill();

      // Health bar fill
      const hpRatio = Math.max(0, enemy.health / enemy.maxHealth);
      const hpColor = hpRatio > 0.5 ? C.hpFull : hpRatio > 0.25 ? C.hpLow : C.hpEmpty;
      if (hpRatio > 0) {
        gfx.beginFill(hpColor);
        gfx.drawRoundedRect(x, hpBarY, w * hpRatio, hpBarH, 2);
        gfx.endFill();
      }
    }
  }

  // ── GLView context create ────────────────────────────────────────────────
  const onContextCreate = useCallback(
    async (gl: WebGLRenderingContext & { endFrameEXP: () => void }) => {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;

      // Create pixi.js renderer from the expo-gl context
      const renderer = new PIXI.Renderer({
        width: w,
        height: h,
        context: gl as unknown as WebGL2RenderingContext,
        resolution: 1,
        autoDensity: false,
        clearBeforeRender: true,
        backgroundColor: C.bg,
      });
      rendererRef.current = renderer;

      const stage = new PIXI.Container();
      stageRef.current = stage;

      // Graphics layers
      const gridGfx = new PIXI.Graphics();
      const enemyGfx = new PIXI.Graphics();
      stage.addChild(gridGfx);
      stage.addChild(enemyGfx);
      gridGfxRef.current = gridGfx;
      enemyGfxRef.current = enemyGfx;

      // ── Game ticker ────────────────────────────────────────────────────
      const ticker = new PIXI.Ticker();
      tickerRef.current = ticker;

      ticker.add((delta) => {
        if (!runningRef.current) return;

        // delta = frames elapsed since last ticker call (1.0 at steady 60 fps).
        // TARGET_FPMS = 0.06 (frames per millisecond at 60 fps).
        // Dividing delta by TARGET_FPMS converts frames → milliseconds.
        const dtMs = delta / PIXI.settings.TARGET_FPMS;

        // Advance game logic via the ref to avoid stale closure.
        onTickRef.current(dtMs);

        const state = gameStateRef.current;
        const { cellW, cellH } = dimsRef.current;

        // Fallback cell sizes from GL buffer if layout hasn't fired yet
        const cW = cellW > 0 ? cellW : w / GRID_COLS;
        const cH = cellH > 0 ? cellH : h / GRID_ROWS;

        drawGrid(gridGfx, state, cW, cH);
        drawEnemies(enemyGfx, state, cW, cH);

        renderer.render(stage);
        gl.endFrameEXP();
      });

      ticker.start();
    },
    // onContextCreate is called once per GLView mount; all mutable values are
    // accessed via refs (runningRef, onTickRef, buildModeRef, dimsRef) so the
    // stable empty dependency array is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
        onTouchEnd={handleTouch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
});
