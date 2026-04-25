import {
  generateObstaclesForLevel,
  findShortestPath,
  hasLineOfSight,
  canPlaceTower,
  createInitialState,
  placeTower,
  tickGame,
  getLevelDifficulty,
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

  it('supports creating a state for a specific level', () => {
    const state = createInitialState(4);
    expect(state.level).toBe(4);
  });

  it('creates obstacle layouts that still keep a ground path open', () => {
    const state = createInitialState(3);
    expect(state.obstacles.length).toBeGreaterThan(0);
    expect(findShortestPath([], state.obstacles)).not.toBeNull();
  });

  it('exposes at most one spawn marker per enemy category', () => {
    const state = createInitialState(1);
    const groundCount = state.spawnMarkers.filter((marker) => marker.category === 'ground').length;
    const airCount = state.spawnMarkers.filter((marker) => marker.category === 'air').length;
    expect(groundCount).toBeLessThanOrEqual(1);
    expect(airCount).toBeLessThanOrEqual(1);
    expect(state.spawnMarkers.some((marker) => marker.category === 'ground')).toBe(true);
  });
});

describe('generateObstaclesForLevel', () => {
  it('creates deterministic obstacle variants per level and keeps at least one route', () => {
    const first = generateObstaclesForLevel(5);
    const second = generateObstaclesForLevel(5);
    expect(first).toEqual(second);
    expect(findShortestPath([], first)).not.toBeNull();
    expect(new Set(first.map((o) => o.variant)).size).toBeGreaterThan(1);
  });
});

describe('getLevelDifficulty', () => {
  it('scales enemy and wave parameters upward for higher levels', () => {
    const level1 = getLevelDifficulty(1);
    const level8 = getLevelDifficulty(8);
    expect(level8.enemyHealthMultiplier).toBeGreaterThan(level1.enemyHealthMultiplier);
    expect(level8.enemiesPerWave).toBeGreaterThanOrEqual(level1.enemiesPerWave);
    expect(level8.spawnIntervalMs).toBeLessThan(level1.spawnIntervalMs);
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

  it('treats obstacles as blocking for ground pathing', () => {
    const obstacles = Array.from({ length: GRID_ROWS }, (_, rowIndex) => ({
      id: rowIndex + 1,
      row: rowIndex,
      col: 6,
      variant: 'rockA' as const,
    }));
    expect(findShortestPath([], obstacles)).toBeNull();
  });
});

describe('hasLineOfSight', () => {
  it('returns false when an obstacle is between tower and target', () => {
    const tower: Tower = { id: 1, row: PATH_ROW, col: 2, cooldownMs: 0, towerType: 'archer' };
    const enemy = { id: 1, row: PATH_ROW, col: 4, health: 60, maxHealth: 60, category: 'ground' as const };
    const obstacles = [{ id: 1, row: PATH_ROW, col: 3, variant: 'rockA' as const }];

    expect(hasLineOfSight(tower, enemy, obstacles)).toBe(false);
  });

  it('returns true when the target itself is on the obstacle cell', () => {
    const tower: Tower = { id: 1, row: AIR_ROW + 1, col: 2, cooldownMs: 0, towerType: 'archer' };
    const enemy = { id: 1, row: AIR_ROW, col: 4, health: 60, maxHealth: 60, category: 'air' as const };
    const obstacles = [{ id: 1, row: AIR_ROW, col: 4, variant: 'rockB' as const }];

    expect(hasLineOfSight(tower, enemy, obstacles)).toBe(true);
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

  it('varies ground enemy spawn rows over multiple spawns', () => {
    let state: GameState = {
      ...createInitialState(),
      obstacles: [],
      spawnMarkers: [],
      enemies: [],
      enemiesSpawned: 0,
      elapsedMs: 0,
      lastSpawnMs: -SPAWN_INTERVAL_MS,
      wave: 1,
    };

    const spawnedRows = new Set<number>();
    for (let index = 0; index < 3; index++) {
      state = { ...state, elapsedMs: state.elapsedMs + SPAWN_INTERVAL_MS };
      state = tickGame(state, 0);
      const latest = state.enemies[state.enemies.length - 1];
      spawnedRows.add(latest.spawnRow ?? PATH_ROW);
    }

    expect(spawnedRows.size).toBeGreaterThan(1);
  });

  it('shows only the next marker per category and hides a spawn point after enemy becomes visible', () => {
    const hiddenGroundState: GameState = {
      ...createInitialState(),
      obstacles: [],
      spawnMarkers: [],
      wave: 2,
      enemiesSpawned: 1,
      elapsedMs: 0,
      lastSpawnMs: 0,
      enemies: [{
        id: 1,
        col: -0.2,
        row: PATH_ROW + 2,
        spawnRow: PATH_ROW + 2,
        health: 60,
        maxHealth: 60,
        category: 'ground',
        enemyType: 'orc',
      }],
    };

    const hiddenNext = tickGame(hiddenGroundState, 0);
    const groundHiddenMarker = hiddenNext.spawnMarkers.find((marker) => marker.category === 'ground');
    expect(groundHiddenMarker?.row).toBe(PATH_ROW + 2);
    expect(hiddenNext.spawnMarkers.filter((marker) => marker.category === 'ground')).toHaveLength(1);
    expect(hiddenNext.spawnMarkers.filter((marker) => marker.category === 'air')).toHaveLength(1);

    const visibleGroundState: GameState = {
      ...hiddenGroundState,
      enemies: [{ ...hiddenGroundState.enemies[0], col: 0.2 }],
    };
    const visibleNext = tickGame(visibleGroundState, 0);
    const groundVisibleMarker = visibleNext.spawnMarkers.find((marker) => marker.category === 'ground');
    expect(groundVisibleMarker).toBeTruthy();
    expect(groundVisibleMarker?.row).not.toBe(PATH_ROW + 2);
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
      expect(next.projectiles.length).toBeGreaterThan(0);
    }
  });

  it('expires projectiles after their ttl', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [{ id: 1, col: 5, health: 60, maxHealth: 60 }],
      towers: [{ id: 1, row: PATH_ROW - 1, col: 5, cooldownMs: 0, towerType: 'archer' }],
      enemiesSpawned: ENEMIES_PER_WAVE,
    };
    const fired = tickGame(state);
    expect(fired.projectiles.length).toBeGreaterThan(0);
    const advanced = tickGame(fired, 500);
    expect(advanced.projectiles).toHaveLength(0);
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

  it('tower does not fire through an obstacle', () => {
    const state: GameState = {
      ...createInitialState(),
      obstacles: [{ id: 1, row: PATH_ROW, col: 3, variant: 'rockA' }],
      enemies: [{ id: 1, col: 4, row: PATH_ROW, health: 60, maxHealth: 60, category: 'ground', enemyType: 'orc' }],
      towers: [{ id: 1, row: PATH_ROW, col: 2, cooldownMs: 0, towerType: 'archer' }],
      enemiesSpawned: ENEMIES_PER_WAVE,
    };

    const next = tickGame(state, 0);
    expect(next.enemies[0].health).toBe(60);
    expect(next.projectiles).toHaveLength(0);
  });

  it('tower can hit an air enemy directly on an obstacle cell', () => {
    const state: GameState = {
      ...createInitialState(),
      obstacles: [{ id: 1, row: AIR_ROW, col: 4, variant: 'rockB' }],
      enemies: [{ id: 1, col: 4, row: AIR_ROW, health: 60, maxHealth: 60, category: 'air', enemyType: 'harpy' }],
      towers: [{ id: 1, row: AIR_ROW + 1, col: 2, cooldownMs: 0, towerType: 'archer' }],
      enemiesSpawned: ENEMIES_PER_WAVE,
    };

    const next = tickGame(state, 0);
    expect(next.enemies[0].health).toBe(60 - TOWER_STATS.archer.damage);
    expect(next.projectiles.length).toBeGreaterThan(0);
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

  it('applies higher-level health scaling to spawned enemies', () => {
    const levelOne = tickGame(createInitialState(1));
    const levelFive = tickGame(createInitialState(5));
    expect(levelFive.enemies[0].health).toBeGreaterThan(levelOne.enemies[0].health);
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
    const chokeTowers: Tower[] = Array.from({ length: GRID_ROWS }, (_, rowIndex) => rowIndex)
      .filter((rowIndex) => rowIndex !== PATH_ROW)
      .map((rowIndex, index) => ({
        id: index + 1,
        row: rowIndex,
        col: 1,
        cooldownMs: 0,
      }));
    const state: GameState = {
      ...createInitialState(),
      towers: chokeTowers,
    };

    // Closing the last open cell in column 1 blocks every possible route.
    expect(canPlaceTower(state, PATH_ROW, 1)).toBe(false);
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

  it('returns false when the cell contains an obstacle', () => {
    const state = createInitialState(2);
    const obstacle = state.obstacles[0];
    expect(canPlaceTower(state, obstacle.row, obstacle.col)).toBe(false);
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
    const chokeTowers: Tower[] = Array.from({ length: GRID_ROWS }, (_, rowIndex) => rowIndex)
      .filter((rowIndex) => rowIndex !== PATH_ROW)
      .map((rowIndex, index) => ({
        id: index + 1,
        row: rowIndex,
        col: 1,
        cooldownMs: 0,
      }));
    const state: GameState = {
      ...createInitialState(),
      towers: chokeTowers,
      nextTowerId: chokeTowers.length + 1,
    };
    expect(placeTower(state, PATH_ROW, 1)).toBe(state);
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
