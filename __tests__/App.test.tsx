import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import App from '../App';
import { STARTING_GOLD, STARTING_LIVES, TOWER_COST } from '../components/game/constants';

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

  it('shows the Build Tower button', () => {
    expect(screen.getByLabelText('Build tower')).toBeTruthy();
  });

  it('entering build mode shows the Cancel button', () => {
    fireEvent.press(screen.getByLabelText('Build tower'));
    expect(screen.getByLabelText('Cancel build')).toBeTruthy();
  });

  it('cancelling build mode restores the Build Tower button', () => {
    fireEvent.press(screen.getByLabelText('Build tower'));
    fireEvent.press(screen.getByLabelText('Cancel build'));
    expect(screen.getByLabelText('Build tower')).toBeTruthy();
  });

  it('pressing a non-path cell in build mode places a tower and deducts gold', () => {
    fireEvent.press(screen.getByLabelText('Build tower'));
    // Row 0, col 0 is a valid build cell (not PATH_ROW)
    fireEvent.press(screen.getByLabelText('Cell row 0 col 0'));
    expect(screen.getByText(String(STARTING_GOLD - TOWER_COST))).toBeTruthy();
    // Build mode is cancelled automatically after placement
    expect(screen.getByLabelText('Build tower')).toBeTruthy();
  });
});
