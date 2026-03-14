import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  onResume: () => void;
  onQuitToMenu: () => void;
}

export default function PauseMenuScreen({ onResume, onQuitToMenu }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <Text style={styles.title}>Paused</Text>
        <TouchableOpacity
          style={styles.resumeButton}
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel="Resume game"
        >
          <Text style={styles.resumeButtonText}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quitButton}
          onPress={onQuitToMenu}
          accessibilityRole="button"
          accessibilityLabel="Quit to Menu"
        >
          <Text style={styles.quitButtonText}>Quit to Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    width: 260,
    borderWidth: 1,
    borderColor: '#f0c040',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f0c040',
    marginBottom: 24,
  },
  resumeButton: {
    backgroundColor: '#f0c040',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  resumeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0a1a',
  },
  quitButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a0b8d0',
    width: '100%',
    alignItems: 'center',
  },
  quitButtonText: {
    fontSize: 18,
    color: '#a0b8d0',
  },
});
