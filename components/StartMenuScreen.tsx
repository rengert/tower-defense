import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  onStartGame: () => void;
}

export default function StartMenuScreen({ onStartGame }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tower Defense</Text>
      <Text style={styles.subtitle}>Defend your base!</Text>
      <TouchableOpacity
        style={styles.startButton}
        onPress={onStartGame}
        accessibilityRole="button"
        accessibilityLabel="Start Game"
      >
        <Text style={styles.startButtonText}>Start Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f0c040',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#a0b8d0',
    marginBottom: 48,
  },
  startButton: {
    backgroundColor: '#f0c040',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0a0a1a',
  },
});
