import {
  canPlaceTower,
  createInitialState,
  placeTower,
  tickGame,
} from '../components/game/logic';
import {
  ENEMY_GOLD_REWARD,
  ENEMIES_PER_WAVE,
  GRID_COLS,
  PATH_ROW,
  SPAWN_INTERVAL_MS,
  STARTING_GOLD,
  STARTING_LIVES,
  TICK_MS,
  TOTAL_WAVES,
  TOWER_COST,
  TOWER_DAMAGE,
  TOWER_RANGE,
} from '../components/game/constants';
import type { GameState } from '../components/game/types';

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

  it('does not spawn more enemies than ENEMIES_PER_WAVE * wave', () => {
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
      enemies: [{ id: 1, col: 5, health: TOWER_DAMAGE, maxHealth: 60 }],
      towers: [{ id: 1, row: PATH_ROW - 1, col: 5, cooldownMs: 0 }],
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
      towers: [{ id: 1, row: PATH_ROW - 1, col: 5, cooldownMs: 500 }],
    };
    const next = tickGame(state);
    expect(next.enemies[0].health).toBe(60); // no damage
    expect(next.towers[0].cooldownMs).toBe(500 - TICK_MS);
  });

  it('tower reduces enemy health when in range', () => {
    const state: GameState = {
      ...createInitialState(),
      enemies: [{ id: 1, col: 5, health: 60, maxHealth: 60 }],
      towers: [{ id: 1, row: PATH_ROW - 1, col: 5, cooldownMs: 0 }],
    };
    const next = tickGame(state);
    const distToEnemy = Math.sqrt(
      (5 - 5) ** 2 + (PATH_ROW - (PATH_ROW - 1)) ** 2
    );
    if (distToEnemy <= TOWER_RANGE) {
      // should have fired
      expect(next.enemies[0].health).toBe(60 - TOWER_DAMAGE);
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
        },
      ],
    };
    const next = tickGame(state);
    expect(next.enemies[0].health).toBe(60);
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
      enemiesSpawned: ENEMIES_PER_WAVE * TOTAL_WAVES,
      wave: TOTAL_WAVES,
    };
    const next = tickGame(state);
    expect(next.status).toBe('won');
  });
});

describe('canPlaceTower', () => {
  it('returns false for path row', () => {
    expect(canPlaceTower(createInitialState(), PATH_ROW, 5)).toBe(false);
  });

  it('returns false when gold is insufficient', () => {
    const state: GameState = {
      ...createInitialState(),
      gold: TOWER_COST - 1,
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

  it('returns true for a valid empty non-path cell', () => {
    expect(canPlaceTower(createInitialState(), PATH_ROW - 1, 5)).toBe(true);
  });
});

describe('placeTower', () => {
  it('places a tower and deducts gold', () => {
    const state = createInitialState();
    const next = placeTower(state, PATH_ROW - 1, 5);
    expect(next.towers).toHaveLength(1);
    expect(next.towers[0]).toMatchObject({ row: PATH_ROW - 1, col: 5, cooldownMs: 0 });
    expect(next.gold).toBe(STARTING_GOLD - TOWER_COST);
  });

  it('returns the same state when placement is invalid', () => {
    const state = createInitialState();
    expect(placeTower(state, PATH_ROW, 5)).toBe(state);
  });

  it('increments nextTowerId after placement', () => {
    const state = createInitialState();
    const next = placeTower(state, PATH_ROW - 1, 5);
    expect(next.nextTowerId).toBe(state.nextTowerId + 1);
  });
});
