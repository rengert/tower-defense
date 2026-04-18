import {
  findShortestPath,
  canPlaceTower,
  createInitialState,
  placeTower,
  tickGame,
} from '../components/game/logic';
import {
  AIR_ROW,
  ENEMY_GOLD_REWARD,
  ENEMIES_PER_WAVE,
  GRID_COLS,
  GRID_ROWS,
  PATH_ROW,
  SPAWN_INTERVAL_MS,
  STARTING_GOLD,
  STARTING_LIVES,
  TICK_MS,
  TOTAL_WAVES,
  TOWER_STATS,
} from '../components/game/constants';
import type { GameState, Tower } from '../components/game/types';

describe('createInitialState', () => {
  it('returns the correct starting values', () => {
    const state = createInitialState();
    expect(state.gold).toBe(STARTING_GOLD);
    expect(state.lives).toBe(STARTING_LIVES);
    expect(state.wave).toBe(1);
    expect(state.status).toBe('playing');
    expect(state.enemies).toHaveLength(0);
    expect(state.towers).toHaveLength(0);
    expect(state.enemiesSpawned).toBe(0);
    expect(state.enemiesKilled).toBe(0);
  });
});

describe('findShortestPath', () => {
  it('returns a straight path when no towers are present', () => {
    const path = findShortestPath([]);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ row: PATH_ROW, col: 0 });
    expect(path![path!.length - 1]).toEqual({ row: PATH_ROW, col: GRID_COLS - 1 });
    // Straight line has exactly GRID_COLS cells
    expect(path!).toHaveLength(GRID_COLS);
  });

  it('finds a detour when PATH_ROW is partially blocked', () => {
    // Block the middle of PATH_ROW
    const towers: Tower[] = [{ id: 1, row: PATH_ROW, col: 5, cooldownMs: 0 }];
    const path = findShortestPath(towers);
    expect(path).not.toBeNull();
    // Path must go through a different row to bypass the blocked cell
    const usesDetour = path!.some((point) => point.row !== PATH_ROW);
    expect(usesDetour).toBe(true);
  });

  it('returns null when all cells of a column are blocked', () => {
    // Block every row at col 5 – no way through
    const towers: Tower[] = Array.from({ length: GRID_ROWS }, (_, rowIndex) => ({
      id: rowIndex,
      row: rowIndex,
      col: 5,
      cooldownMs: 0,
    }));
    expect(findShortestPath(towers)).toBeNull();
  });

  it('returns null when the start cell is blocked', () => {
    const towers: Tower[] = [{ id: 1, row: PATH_ROW, col: 0, cooldownMs: 0 }];
    expect(findShortestPath(towers)).toBeNull();
  });

  it('returns null when the end cell is blocked', () => {
    const towers: Tower[] = [{ id: 1, row: PATH_ROW, col: GRID_COLS - 1, cooldownMs: 0 }];
    expect(findShortestPath(towers)).toBeNull();
  });
});

describe('tickGame', () => {
  it('does nothing when status is not playing', () => {
    const won: GameState = { ...createInitialState(), status: 'won' };
    expect(tickGame(won)).toBe(won);
    const lost: GameState = { ...createInitialState(), status: 'lost' };
    expect(tickGame(lost)).toBe(lost);
  });

  it('advances elapsedMs by TICK_MS each tick', () => {
    const state = createInitialState();
    const next = tickGame(state);
    expect(next.elapsedMs).toBe(TICK_MS);
  });

  it('spawns an enemy when enough time has passed', () => {
    // lastSpawnMs is set to -SPAWN_INTERVAL_MS so first tick should spawn
    const state = createInitialState();
    const next = tickGame(state);
    expect(next.enemies).toHaveLength(1);
    expect(next.enemiesSpawned).toBe(1);
  });

  it('does not spawn more enemies than ENEMIES_PER_WAVE per wave', () => {
    let state = createInitialState();
    // Force elapsedMs past multiple spawn intervals
    for (let i = 0; i < ENEMIES_PER_WAVE * 3; i++) {
      state = { ...state, elapsedMs: state.elapsedMs + SPAWN_INTERVAL_MS };
      state = tickGame(state);
    }
    expect(state.enemiesSpawned).toBeLessThanOrEqual(ENEMIES_PER_WAVE);
  });

  it('moves enemies forward each tick', () => {
    let state = createInitialState();
    state = tickGame(state); // spawns first enemy at col = -1
    const initialCol = state.enemies[0].col;
    state = tickGame(state);
    expect(state.enemies[0].col).toBeGreaterThan(initialCol);
  });

  it('removes an enemy and decrements lives when it reaches the exit', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [{ id: 1, col: GRID_COLS - 0.01, health: 60, maxHealth: 60 }],
      // Prevent new spawns from interfering
      enemiesSpawned: ENEMIES_PER_WAVE,
    };
    const next = tickGame(state);
    expect(next.enemies).toHaveLength(0);
    expect(next.lives).toBe(STARTING_LIVES - 1);
  });

  it('awards gold when a tower kills an enemy', () => {
    const state: GameState = {
      ...createInitialState(),
      gold: 0,
      enemies: [{ id: 1, col: 5, health: TOWER_STATS.archer.damage, maxHealth: 60 }],
      towers: [{ id: 1, row: PATH_ROW - 1, col: 5, cooldownMs: 0, towerType: 'archer' }],
      // Prevent new spawns from interfering
      enemiesSpawned: ENEMIES_PER_WAVE,
    };
    const next = tickGame(state);
    expect(next.enemies).toHaveLength(0);
    expect(next.gold).toBe(ENEMY_GOLD_REWARD);
    expect(next.enemiesKilled).toBe(1);
  });

  it('tower does not fire when on cooldown', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [{ id: 1, col: 5, health: 60, maxHealth: 60 }],
      towers: [{ id: 1, row: PATH_ROW - 1, col: 5, cooldownMs: 500, towerType: 'archer' }],
    };
    const next = tickGame(state);
    expect(next.enemies[0].health).toBe(60); // no damage
    expect(next.towers[0].cooldownMs).toBe(500 - TICK_MS);
  });

  it('tower reduces enemy health when in range', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [{ id: 1, col: 5, health: 60, maxHealth: 60 }],
      towers: [{ id: 1, row: PATH_ROW - 1, col: 5, cooldownMs: 0, towerType: 'archer' }],
    };
    const next = tickGame(state);
    const distToEnemy = Math.sqrt(
      (5 - 5) ** 2 + (PATH_ROW - (PATH_ROW - 1)) ** 2
    );
    if (distToEnemy <= TOWER_STATS.archer.range) {
      // should have fired
      expect(next.enemies[0].health).toBe(60 - TOWER_STATS.archer.damage);
    }
  });

  it('tower does not fire when enemy is out of range', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [{ id: 1, col: 0, health: 60, maxHealth: 60 }],
      towers: [
        {
          id: 1,
          row: PATH_ROW - 1,
          col: GRID_COLS - 1,
          cooldownMs: 0,
          towerType: 'archer',
        },
      ],
    };
    const next = tickGame(state);
    expect(next.enemies[0].health).toBe(60);
  });

  it('cannon attacks ground enemies but ignores air enemies', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [
        { id: 1, col: 5, row: PATH_ROW, health: 60, maxHealth: 60, category: 'ground', enemyType: 'orc' },
        { id: 2, col: 5, row: AIR_ROW, health: 60, maxHealth: 60, category: 'air', enemyType: 'harpy' },
      ],
      towers: [{ id: 1, row: PATH_ROW - 1, col: 5, cooldownMs: 0, towerType: 'cannon' }],
      enemiesSpawned: ENEMIES_PER_WAVE,
    };

    const next = tickGame(state);
    expect(next.enemies.find((enemy) => enemy.id === 1)?.health).toBe(60 - TOWER_STATS.cannon.damage);
    expect(next.enemies.find((enemy) => enemy.id === 2)?.health).toBe(60);
  });

  it('magic attacks air enemies but ignores ground enemies', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [
        { id: 1, col: 5, row: PATH_ROW, health: 60, maxHealth: 60, category: 'ground', enemyType: 'orc' },
        { id: 2, col: 5, row: AIR_ROW, health: 60, maxHealth: 60, category: 'air', enemyType: 'harpy' },
      ],
      towers: [{ id: 1, row: AIR_ROW + 1, col: 5, cooldownMs: 0, towerType: 'magic' }],
      enemiesSpawned: ENEMIES_PER_WAVE,
    };

    const next = tickGame(state);
    expect(next.enemies.find((enemy) => enemy.id === 1)?.health).toBe(60);
    expect(next.enemies.find((enemy) => enemy.id === 2)?.health).toBe(60 - TOWER_STATS.magic.damage);
  });

  it('spawns air enemies in later waves on the air row', () => {
    let state: GameState = {
      ...createInitialState(),
      wave: 2,
      elapsedMs: SPAWN_INTERVAL_MS,
      lastSpawnMs: 0,
    };

    state = tickGame(state);
    state = {
      ...state,
      elapsedMs: state.elapsedMs + SPAWN_INTERVAL_MS,
    };
    state = tickGame(state);

    expect(state.enemies[1].category).toBe('air');
    expect(state.enemies[1].row).toBe(AIR_ROW);
  });

  it('sets status to lost when lives reach zero', () => {
    const state: GameState = {
      ...createInitialState(),
      lives: 1,
      enemies: [{ id: 1, col: GRID_COLS - 0.01, health: 60, maxHealth: 60 }],
    };
    const next = tickGame(state);
    expect(next.status).toBe('lost');
    expect(next.lives).toBe(0);
  });

  it('advances to the next wave when all enemies are defeated', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [],
      enemiesSpawned: ENEMIES_PER_WAVE, // wave 1 fully spawned
      wave: 1,
    };
    const next = tickGame(state);
    expect(next.wave).toBe(2);
    expect(next.enemiesSpawned).toBe(0);
  });

  it('sets status to won after defeating all waves', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [],
      enemiesSpawned: ENEMIES_PER_WAVE, // all enemies of the last wave defeated
      wave: TOTAL_WAVES,
    };
    const next = tickGame(state);
    expect(next.status).toBe('won');
  });
});

describe('canPlaceTower', () => {
  it('allows placement on path row when a detour still exists', () => {
    // Mid-row cell – enemies can detour around it
    expect(canPlaceTower(createInitialState(), PATH_ROW, 5)).toBe(true);
  });

  it('returns false when tower would block the only remaining path', () => {
    // The BFS start cell (PATH_ROW, 0) is the gateway – blocking it cuts all routes
    expect(canPlaceTower(createInitialState(), PATH_ROW, 0)).toBe(false);
  });

  it('returns false when gold is insufficient', () => {
    const state: GameState = {
      ...createInitialState(),
      gold: TOWER_STATS.archer.cost - 1,
    };
    expect(canPlaceTower(state, PATH_ROW - 1, 5)).toBe(false);
  });

  it('returns false when cell is already occupied', () => {
    const state: GameState = {
      ...createInitialState(),
      towers: [{ id: 1, row: 2, col: 5, cooldownMs: 0 }],
    };
    expect(canPlaceTower(state, 2, 5)).toBe(false);
  });

  it('returns true for a valid empty cell', () => {
    expect(canPlaceTower(createInitialState(), PATH_ROW - 1, 5)).toBe(true);
  });
});

describe('placeTower', () => {
  it('places a tower and deducts gold', () => {
    const state = createInitialState();
    const next = placeTower(state, PATH_ROW - 1, 5);
    expect(next.towers).toHaveLength(1);
    expect(next.towers[0]).toMatchObject({ row: PATH_ROW - 1, col: 5, cooldownMs: 0, towerType: 'archer' });
    expect(next.gold).toBe(STARTING_GOLD - TOWER_STATS.archer.cost);
  });

  it('returns the same state when placement is invalid', () => {
    const state = createInitialState();
    // PATH_ROW,0 blocks the BFS start – no path can exist, so placement is rejected
    expect(placeTower(state, PATH_ROW, 0)).toBe(state);
  });

  it('increments nextTowerId after placement', () => {
    const state = createInitialState();
    const next = placeTower(state, PATH_ROW - 1, 5);
    expect(next.nextTowerId).toBe(state.nextTowerId + 1);
  });

  it('places a magic tower with its own cost', () => {
    const state = createInitialState();
    const next = placeTower(state, PATH_ROW - 1, 6, 'magic');
    expect(next.towers[0]).toMatchObject({ towerType: 'magic' });
    expect(next.gold).toBe(STARTING_GOLD - TOWER_STATS.magic.cost);
  });
});
