import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from './i18n/LanguageContext';
import type { Language } from './i18n/translations';

interface Props {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: Props) {
  const { language, t, setLanguage } = useLanguage();

  const handleLanguageSelect = async (lang: Language) => {
    await setLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.icon}>⚙</Text>
        <Text style={styles.title}>{t.settingsTitle}</Text>
        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>{t.languageLabel}</Text>
        <View style={styles.languageRow}>
          <TouchableOpacity
            style={[styles.langButton, language === 'de' && styles.langButtonActive]}
            onPress={() => handleLanguageSelect('de')}
            accessibilityRole="button"
            accessibilityLabel={t.languageGerman}
            accessibilityState={{ selected: language === 'de' }}
          >
            <Text style={[styles.langButtonText, language === 'de' && styles.langButtonTextActive]}>
              {t.languageGerman}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langButton, language === 'en' && styles.langButtonActive]}
            onPress={() => handleLanguageSelect('en')}
            accessibilityRole="button"
            accessibilityLabel={t.languageEnglish}
            accessibilityState={{ selected: language === 'en' }}
          >
            <Text style={[styles.langButtonText, language === 'en' && styles.langButtonTextActive]}>
              {t.languageEnglish}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t.backButton}
        >
          <Text style={styles.backButtonText}>{t.backButton}</Text>
        </TouchableOpacity>
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
  panel: {
    backgroundColor: '#131825',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
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
  sectionLabel: {
    fontSize: 13,
    color: '#5a7080',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
    width: '100%',
  },
  langButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(160,176,200,0.3)',
    backgroundColor: 'transparent',
  },
  langButtonActive: {
    backgroundColor: '#f5c842',
    borderColor: '#f5c842',
  },
  langButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5a7080',
  },
  langButtonTextActive: {
    color: '#0d1017',
  },
  backButton: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(160,176,200,0.3)',
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#5a7080',
  },
});
