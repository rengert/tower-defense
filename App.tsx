import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameScreen from './components/GameScreen';
import { LanguageProvider } from './components/i18n/LanguageContext';
import SettingsScreen from './components/SettingsScreen';
import StartMenuScreen from './components/StartMenuScreen';

type Screen = 'menu' | 'game' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          {screen === 'menu' && (
            <StartMenuScreen
              onStartGame={() => setScreen('game')}
              onOpenSettings={() => setScreen('settings')}
            />
          )}
          {screen === 'game' && (
            <GameScreen onQuitToMenu={() => setScreen('menu')} />
          )}
          {screen === 'settings' && (
            <SettingsScreen onBack={() => setScreen('menu')} />
          )}
        </View>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1017',
  },
});
