import { render, screen } from '@testing-library/react-native';
import React from 'react';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    render(<App />);
  });

  it('renders the game title', () => {
    expect(screen.getByText('Tower Defense')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    expect(screen.getByText('Defend your base!')).toBeTruthy();
  });
});
