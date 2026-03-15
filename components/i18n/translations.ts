export type Language = 'de' | 'en';

export interface Translations {
  // Start menu
  startMenuSubtitle: string;
  startButton: string;
  startHint: string;
  settingsButton: string;

  // Settings screen
  settingsTitle: string;
  languageLabel: string;
  languageGerman: string;
  languageEnglish: string;
  backButton: string;

  // Pause menu
  pausedTitle: string;
  resumeButton: string;
  quitToMenuButton: string;

  // Game HUD
  wave: string;
  lives: string;
  gold: string;
  buildTower: string;
  cancelBuild: string;
  pause: string;

  // Game over / win overlays
  gameOverTitle: string;
  victoryTitle: string;
  playAgain: string;
  backToMenu: string;
  finalScore: string;
}

const en: Translations = {
  startMenuSubtitle: 'Strategic · Tactical · Satisfying',
  startButton: '▶ Start Game',
  startHint: 'Place towers · Survive waves · Defend your base',
  settingsButton: '⚙ Settings',

  settingsTitle: 'SETTINGS',
  languageLabel: 'Language',
  languageGerman: 'Deutsch',
  languageEnglish: 'English',
  backButton: '← Back',

  pausedTitle: 'PAUSED',
  resumeButton: '▶ Resume',
  quitToMenuButton: 'Quit to Menu',

  wave: 'Wave',
  lives: 'Lives',
  gold: 'Gold',
  buildTower: '🏗 Build Tower',
  cancelBuild: '✕ Cancel',
  pause: '⏸',

  gameOverTitle: 'GAME OVER',
  victoryTitle: 'VICTORY!',
  playAgain: 'Play Again',
  backToMenu: 'Back to Menu',
  finalScore: 'You survived',
};

const de: Translations = {
  startMenuSubtitle: 'Strategisch · Taktisch · Befriedigend',
  startButton: '▶ Spiel starten',
  startHint: 'Türme bauen · Wellen überleben · Basis verteidigen',
  settingsButton: '⚙ Einstellungen',

  settingsTitle: 'EINSTELLUNGEN',
  languageLabel: 'Sprache',
  languageGerman: 'Deutsch',
  languageEnglish: 'English',
  backButton: '← Zurück',

  pausedTitle: 'PAUSE',
  resumeButton: '▶ Weiterspielen',
  quitToMenuButton: 'Zum Menü',

  wave: 'Welle',
  lives: 'Leben',
  gold: 'Gold',
  buildTower: '🏗 Turm bauen',
  cancelBuild: '✕ Abbrechen',
  pause: '⏸',

  gameOverTitle: 'GAME OVER',
  victoryTitle: 'SIEG!',
  playAgain: 'Nochmal spielen',
  backToMenu: 'Zum Menü',
  finalScore: 'Du hast überlebt',
};

export const TRANSLATIONS: Record<Language, Translations> = { en, de };

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'de'];

/** Map a device locale string (e.g. "de-DE", "en-US") to a supported Language, defaulting to 'en'. */
export function resolveLanguage(locale: string): Language {
  const tag = locale.toLowerCase().split(/[-_]/)[0];
  if ((SUPPORTED_LANGUAGES as string[]).includes(tag)) {
    return tag as Language;
  }
  return 'en';
}
