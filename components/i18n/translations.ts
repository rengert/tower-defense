export type Language = 'de' | 'en' | 'fr';

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
  languageFrench: string;
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

  // Tower build panel
  towerArcherName: string;
  towerCannonName: string;
  towerMagicName: string;
  towerTargetAll: string;
  towerTargetGround: string;
  towerTargetAir: string;

  // Game over / win overlays
  gameOverTitle: string;
  victoryTitle: string;
  playAgain: string;
  backToMenu: string;
  finalScore: string;

  // Accessibility labels (no emoji, action-oriented)
  startGameA11y: string;
  openSettingsA11y: string;
  backA11y: string;
  resumeGameA11y: string;
  quitToMenuA11y: string;
  pauseGameA11y: string;
  buildTowerA11y: string;
  cancelBuildA11y: string;
  playAgainA11y: string;
  mainMenuA11y: string;
  tryAgainA11y: string;
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
  languageFrench: 'Français',
  backButton: '← Back',

  pausedTitle: 'PAUSED',
  resumeButton: '▶ Resume',
  quitToMenuButton: 'Quit to Menu',

  wave: 'WAVE',
  lives: 'Lives',
  gold: 'Gold',
  buildTower: '🏗 Build Tower',
  cancelBuild: '✕ Cancel',
  pause: '⏸',

  towerArcherName: 'Archer',
  towerCannonName: 'Cannon',
  towerMagicName: 'Magic',
  towerTargetAll: '⚔️+✈️ All',
  towerTargetGround: '⚔️ Ground',
  towerTargetAir: '✈️ Air',

  gameOverTitle: 'GAME OVER',
  victoryTitle: 'VICTORY!',
  playAgain: 'Play Again',
  backToMenu: 'Back to Menu',
  finalScore: 'You survived',

  startGameA11y: 'Start Game',
  openSettingsA11y: 'Open Settings',
  backA11y: 'Back',
  resumeGameA11y: 'Resume game',
  quitToMenuA11y: 'Quit to Menu',
  pauseGameA11y: 'Pause game',
  buildTowerA11y: 'Build tower',
  cancelBuildA11y: 'Cancel build',
  playAgainA11y: 'Play Again',
  mainMenuA11y: 'Main Menu',
  tryAgainA11y: 'Try Again',
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
  languageFrench: 'Français',
  backButton: '← Zurück',

  pausedTitle: 'PAUSE',
  resumeButton: '▶ Weiterspielen',
  quitToMenuButton: 'Zum Menü',

  wave: 'WELLE',
  lives: 'Leben',
  gold: 'Gold',
  buildTower: '🏗 Turm bauen',
  cancelBuild: '✕ Abbrechen',
  pause: '⏸',

  towerArcherName: 'Bogenschütze',
  towerCannonName: 'Kanone',
  towerMagicName: 'Magie',
  towerTargetAll: '⚔️+✈️ Alle',
  towerTargetGround: '⚔️ Boden',
  towerTargetAir: '✈️ Luft',

  gameOverTitle: 'NIEDERLAGE',
  victoryTitle: 'SIEG!',
  playAgain: 'Nochmal spielen',
  backToMenu: 'Zum Menü',
  finalScore: 'Du hast überlebt',

  startGameA11y: 'Spiel starten',
  openSettingsA11y: 'Einstellungen öffnen',
  backA11y: 'Zurück',
  resumeGameA11y: 'Spiel fortsetzen',
  quitToMenuA11y: 'Zum Menü',
  pauseGameA11y: 'Spiel pausieren',
  buildTowerA11y: 'Turm bauen',
  cancelBuildA11y: 'Bau abbrechen',
  playAgainA11y: 'Nochmal spielen',
  mainMenuA11y: 'Zum Menü',
  tryAgainA11y: 'Nochmal versuchen',
};

const fr: Translations = {
  startMenuSubtitle: 'Stratégique · Tactique · Satisfaisant',
  startButton: '▶ Jouer',
  startHint: 'Placez des tours · Survivez aux vagues · Défendez votre base',
  settingsButton: '⚙ Paramètres',

  settingsTitle: 'PARAMÈTRES',
  languageLabel: 'Langue',
  languageGerman: 'Deutsch',
  languageEnglish: 'English',
  languageFrench: 'Français',
  backButton: '← Retour',

  pausedTitle: 'PAUSE',
  resumeButton: '▶ Reprendre',
  quitToMenuButton: 'Quitter',

  wave: 'VAGUE',
  lives: 'Vies',
  gold: 'Or',
  buildTower: '🏗 Construire',
  cancelBuild: '✕ Annuler',
  pause: '⏸',

  towerArcherName: 'Archer',
  towerCannonName: 'Canon',
  towerMagicName: 'Magie',
  towerTargetAll: '⚔️+✈️ Tous',
  towerTargetGround: '⚔️ Sol',
  towerTargetAir: '✈️ Air',

  gameOverTitle: 'DÉFAITE',
  victoryTitle: 'VICTOIRE !',
  playAgain: 'Rejouer',
  backToMenu: 'Menu principal',
  finalScore: 'Vous avez survécu',

  startGameA11y: 'Jouer',
  openSettingsA11y: 'Ouvrir les paramètres',
  backA11y: 'Retour',
  resumeGameA11y: 'Reprendre la partie',
  quitToMenuA11y: 'Quitter vers le menu',
  pauseGameA11y: 'Mettre en pause',
  buildTowerA11y: 'Construire une tour',
  cancelBuildA11y: 'Annuler la construction',
  playAgainA11y: 'Rejouer',
  mainMenuA11y: 'Menu principal',
  tryAgainA11y: 'Réessayer',
};

export const TRANSLATIONS: Record<Language, Translations> = { en, de, fr };

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'de', 'fr'];

/** Map a device locale string (e.g. "de-DE", "en-US") to a supported Language, defaulting to 'en'. */
export function resolveLanguage(locale: string): Language {
  const tag = locale.toLowerCase().split(/[-_]/)[0];
  if ((SUPPORTED_LANGUAGES as string[]).includes(tag)) {
    return tag as Language;
  }
  return 'en';
}
