import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameScreen from './components/GameScreen';
import StartMenuScreen from './components/StartMenuScreen';

type Screen = 'menu' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        {screen === 'menu' && (
          <StartMenuScreen onStartGame={() => setScreen('game')} />
        )}
        {screen === 'game' && (
          <GameScreen onQuitToMenu={() => setScreen('menu')} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
});
