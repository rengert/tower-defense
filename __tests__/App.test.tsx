import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import App from '../App';
import { STARTING_GOLD, STARTING_LIVES, TOWER_STATS } from '../components/game/constants';

// PixiGameRenderer uses expo-gl / pixi.js (WebGL) which is unavailable in Jest.
// The manual mock at components/__mocks__/PixiGameRenderer.tsx replaces it with
// a lightweight View that exposes an "Cell row 0 col 0" touch target for tests.
jest.mock('../components/PixiGameRenderer');

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Provide a stable English locale so language-dependent UI text is predictable.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US', languageCode: 'en' }],
}));

// Provide a no-op AsyncStorage so the persisted language preference is null by default.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

describe('App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    render(<App />);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the start menu with game title', () => {
    expect(screen.getByText(/TOWER/)).toBeTruthy();
  });

  it('renders the start menu subtitle', () => {
    expect(screen.getByText('Strategic · Tactical · Satisfying')).toBeTruthy();
  });

  it('renders the Start Game button on the start menu', () => {
    expect(screen.getByLabelText('Start Game')).toBeTruthy();
  });

  it('navigates to the game screen when Start Game is pressed', () => {
    fireEvent.press(screen.getByLabelText('Start Game'));
    expect(screen.getByLabelText('Pause game')).toBeTruthy();
  });

  it('shows pause menu when Pause is pressed during game', () => {
    fireEvent.press(screen.getByLabelText('Start Game'));
    fireEvent.press(screen.getByLabelText('Pause game'));
    expect(screen.getByText('PAUSED')).toBeTruthy();
    expect(screen.getByLabelText('Resume game')).toBeTruthy();
    expect(screen.getByLabelText('Quit to Menu')).toBeTruthy();
  });

  it('resumes the game when Resume is pressed', () => {
    fireEvent.press(screen.getByLabelText('Start Game'));
    fireEvent.press(screen.getByLabelText('Pause game'));
    fireEvent.press(screen.getByLabelText('Resume game'));
    expect(screen.queryByText('PAUSED')).toBeNull();
    expect(screen.getByLabelText('Pause game')).toBeTruthy();
  });

  it('returns to the start menu when Quit to Menu is pressed', () => {
    fireEvent.press(screen.getByLabelText('Start Game'));
    fireEvent.press(screen.getByLabelText('Pause game'));
    fireEvent.press(screen.getByLabelText('Quit to Menu'));
    expect(screen.getByLabelText('Start Game')).toBeTruthy();
    expect(screen.queryByLabelText('Pause game')).toBeNull();
  });
});

describe('GameScreen HUD', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    render(<App />);
    fireEvent.press(screen.getByLabelText('Start Game'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows lives in the HUD', () => {
    expect(screen.getByText(String(STARTING_LIVES))).toBeTruthy();
  });

  it('shows gold in the HUD', () => {
    expect(screen.getByText(String(STARTING_GOLD))).toBeTruthy();
  });

  it('shows wave counter in the HUD', () => {
    expect(screen.getByText('1/3')).toBeTruthy();
  });
});

describe('GameScreen tower building', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    render(<App />);
    fireEvent.press(screen.getByLabelText('Start Game'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows only unlocked tower build buttons at run start', () => {
    expect(screen.getByText('Archer')).toBeTruthy();
    expect(screen.queryByText('Cannon')).toBeNull();
    expect(screen.queryByText('Magic')).toBeNull();
  });

  it('keeps the tower picker visible after selecting a tower', () => {
    fireEvent.press(screen.getByText('Archer'));
    expect(screen.getByText('Archer')).toBeTruthy();
    expect(screen.queryByLabelText('Cancel build')).toBeNull();
    expect(screen.getByTestId('tower-build-archer').props.accessibilityState.selected).toBe(true);
  });

  it('marks the selected tower as active', () => {
    fireEvent.press(screen.getByText('Archer'));
    expect(screen.getByTestId('tower-build-archer').props.accessibilityState.selected).toBe(true);
  });

  it('placing an archer tower deducts archer cost and keeps the same tower active', () => {
    fireEvent.press(screen.getByText('Archer'));
    // Row 0, col 0 is a valid build cell (not PATH_ROW)
    fireEvent.press(screen.getByLabelText('Cell row 0 col 0'));
    expect(screen.getByText(String(STARTING_GOLD - TOWER_STATS.archer.cost))).toBeTruthy();
    expect(screen.getByTestId('tower-build-archer').props.accessibilityState.selected).toBe(true);
  });
});

describe('Start menu progression panel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    render(<App />);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows meta coins and level selector', () => {
    expect(screen.getByText('Gold')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByText('Level')).toBeTruthy();
  });
});

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    render(<App />);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Open Settings button on the start menu', () => {
    expect(screen.getByLabelText('Open Settings')).toBeTruthy();
  });

  it('navigates to the settings screen when Settings is pressed', () => {
    fireEvent.press(screen.getByLabelText('Open Settings'));
    expect(screen.getByText('SETTINGS')).toBeTruthy();
  });

  it('shows language buttons in the settings screen', () => {
    fireEvent.press(screen.getByLabelText('Open Settings'));
    expect(screen.getByLabelText('Deutsch')).toBeTruthy();
    expect(screen.getByLabelText('English')).toBeTruthy();
    expect(screen.getByLabelText('Français')).toBeTruthy();
  });

  it('returns to the start menu when Back is pressed in settings', () => {
    fireEvent.press(screen.getByLabelText('Open Settings'));
    fireEvent.press(screen.getByLabelText('Back'));
    expect(screen.getByLabelText('Start Game')).toBeTruthy();
    expect(screen.queryByText('SETTINGS')).toBeNull();
  });

  it('switches to German and updates the subtitle', async () => {
    fireEvent.press(screen.getByLabelText('Open Settings'));
    fireEvent.press(screen.getByLabelText('Deutsch'));
    fireEvent.press(screen.getByLabelText('Zurück'));
    expect(screen.getByText('Strategisch · Taktisch · Befriedigend')).toBeTruthy();
  });

  it('switches to French and updates the subtitle', async () => {
    fireEvent.press(screen.getByLabelText('Open Settings'));
    fireEvent.press(screen.getByLabelText('Français'));
    fireEvent.press(screen.getByLabelText('Retour'));
    expect(screen.getByText('Stratégique · Tactique · Satisfaisant')).toBeTruthy();
  });
});
