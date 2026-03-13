import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PauseMenuScreen from './PauseMenuScreen';

interface Props {
  onQuitToMenu: () => void;
}

export default function GameScreen({ onQuitToMenu }: Props) {
  const [paused, setPaused] = useState(false);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tower Defense</Text>
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={() => setPaused(true)}
            accessibilityRole="button"
            accessibilityLabel="Pause game"
          >
            <Text style={styles.pauseButtonText}>⏸ Pause</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.gameArea}>
        <Text style={styles.placeholder}>Game content coming soon…</Text>
      </View>

      {paused && (
        <PauseMenuScreen
          onResume={() => setPaused(false)}
          onQuitToMenu={onQuitToMenu}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  safeArea: {
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f0c040',
  },
  pauseButton: {
    backgroundColor: '#f0c040',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  pauseButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0a0a1a',
  },
  gameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#a0b8d0',
  },
});
