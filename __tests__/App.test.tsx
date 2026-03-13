import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    render(<App />);
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
