import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import App from '../App';
import { STARTING_GOLD, STARTING_LIVES, TOWER_COST } from '../components/game/constants';

describe('App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    render(<App />);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the start menu with game title', () => {
    expect(screen.getByText('Tower Defense')).toBeTruthy();
  });

  it('renders the start menu subtitle', () => {
    expect(screen.getByText('Defend your base!')).toBeTruthy();
  });

  it('renders the Start Game button on the start menu', () => {
    expect(screen.getByText('Start Game')).toBeTruthy();
  });

  it('navigates to the game screen when Start Game is pressed', () => {
    fireEvent.press(screen.getByText('Start Game'));
    expect(screen.getByText('⏸ Pause')).toBeTruthy();
  });

  it('shows pause menu when Pause is pressed during game', () => {
    fireEvent.press(screen.getByText('Start Game'));
    fireEvent.press(screen.getByText('⏸ Pause'));
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.getByText('Resume')).toBeTruthy();
    expect(screen.getByText('Quit to Menu')).toBeTruthy();
  });

  it('resumes the game when Resume is pressed', () => {
    fireEvent.press(screen.getByText('Start Game'));
    fireEvent.press(screen.getByText('⏸ Pause'));
    fireEvent.press(screen.getByText('Resume'));
    expect(screen.queryByText('Paused')).toBeNull();
    expect(screen.getByText('⏸ Pause')).toBeTruthy();
  });

  it('returns to the start menu when Quit to Menu is pressed', () => {
    fireEvent.press(screen.getByText('Start Game'));
    fireEvent.press(screen.getByText('⏸ Pause'));
    fireEvent.press(screen.getByText('Quit to Menu'));
    expect(screen.getByText('Start Game')).toBeTruthy();
    expect(screen.queryByText('⏸ Pause')).toBeNull();
  });
});

describe('GameScreen HUD', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    render(<App />);
    fireEvent.press(screen.getByText('Start Game'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows lives in the HUD', () => {
    expect(screen.getByText(`❤️ ${STARTING_LIVES}`)).toBeTruthy();
  });

  it('shows gold in the HUD', () => {
    expect(screen.getByText(`💰 ${STARTING_GOLD}`)).toBeTruthy();
  });

  it('shows wave counter in the HUD', () => {
    expect(screen.getByText('Wave 1/3')).toBeTruthy();
  });
});

describe('GameScreen tower building', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    render(<App />);
    fireEvent.press(screen.getByText('Start Game'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the Build Tower button', () => {
    expect(screen.getByText(`🗼 Build Tower (50 💰)`)).toBeTruthy();
  });

  it('entering build mode shows the Cancel button', () => {
    fireEvent.press(screen.getByText(`🗼 Build Tower (50 💰)`));
    expect(screen.getByText('✕ Cancel')).toBeTruthy();
  });

  it('cancelling build mode restores the Build Tower button', () => {
    fireEvent.press(screen.getByText(`🗼 Build Tower (50 💰)`));
    fireEvent.press(screen.getByText('✕ Cancel'));
    expect(screen.getByText(`🗼 Build Tower (50 💰)`)).toBeTruthy();
  });

  it('pressing a non-path cell in build mode places a tower and deducts gold', () => {
    fireEvent.press(screen.getByText(`🗼 Build Tower (50 💰)`));
    // Row 0, col 0 is a valid build cell (not PATH_ROW)
    fireEvent.press(screen.getByLabelText('Cell row 0 col 0'));
    expect(screen.getByText(`💰 ${STARTING_GOLD - TOWER_COST}`)).toBeTruthy();
    // Build mode is cancelled automatically after placement
    expect(screen.getByText(`🗼 Build Tower (50 💰)`)).toBeTruthy();
  });
});
