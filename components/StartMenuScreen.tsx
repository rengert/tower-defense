import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  onStartGame: () => void;
}

export default function StartMenuScreen({ onStartGame }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <Text style={styles.towerIcon}>🗼</Text>
        <Text style={styles.title}>TOWER{'\n'}DEFENSE</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Strategic · Tactical · Satisfying</Text>
      </View>

      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={onStartGame}
          accessibilityRole="button"
          accessibilityLabel="Start Game"
        >
          <Text style={styles.startButtonText}>▶ Start Game</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Place towers · Survive waves · Defend your base</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1017',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 56,
  },
  towerIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 46,
    fontWeight: '900',
    color: '#f5c842',
    letterSpacing: 5,
    textAlign: 'center',
    lineHeight: 52,
    marginBottom: 20,
  },
  divider: {
    width: 56,
    height: 3,
    backgroundColor: '#f5c842',
    borderRadius: 2,
    marginBottom: 14,
    opacity: 0.6,
  },
  subtitle: {
    fontSize: 14,
    color: '#5a7080',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  startButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0d1017',
    letterSpacing: 1,
  },
  hint: {
    fontSize: 12,
    color: '#3a4a5a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
