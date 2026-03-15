import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from './i18n/LanguageContext';

interface Props {
  onResume: () => void;
  onQuitToMenu: () => void;
}

export default function PauseMenuScreen({ onResume, onQuitToMenu }: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <Text style={styles.icon}>⏸</Text>
        <Text style={styles.title}>{t.pausedTitle}</Text>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.resumeButton}
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel={t.resumeButton}
        >
          <Text style={styles.resumeButtonText}>{t.resumeButton}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quitButton}
          onPress={onQuitToMenu}
          accessibilityRole="button"
          accessibilityLabel={t.quitToMenuButton}
        >
          <Text style={styles.quitButtonText}>{t.quitToMenuButton}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,8,18,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: '#131825',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: 280,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.4)',
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f5c842',
    letterSpacing: 3,
    marginBottom: 20,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#f5c842',
    borderRadius: 1,
    opacity: 0.4,
    marginBottom: 24,
  },
  resumeButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  resumeButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0d1017',
    letterSpacing: 0.5,
  },
  quitButton: {
    backgroundColor: 'transparent',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(160,176,200,0.3)',
    width: '100%',
    alignItems: 'center',
  },
  quitButtonText: {
    fontSize: 16,
    color: '#5a7080',
  },
});
