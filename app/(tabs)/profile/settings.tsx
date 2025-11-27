import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.textPrimary ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.primary ?? '#6366F1';
const DANGER = '#F97373';

type SettingsItem = {
  key: string;
  label: string;
};

type SettingsSection = {
  title: string;
  items: SettingsItem[];
};

const SECTIONS: SettingsSection[] = [
  {
    title: 'General',
    items: [
      { key: 'notifications', label: 'Notifications' },
      { key: 'goal_settings', label: 'Goal settings' },
      { key: 'advanced', label: 'Advanced' },
    ],
  },
  {
    title: 'Strength',
    items: [
      { key: 'rest_timer', label: 'Rest timer' },
      { key: 'warm_up_settings', label: 'Warm-up settings' },
    ],
  },
  {
    title: 'Cardio',
    items: [{ key: 'speed_or_pace', label: 'Speed or pace' }],
  },
  {
    title: 'Units',
    items: [
      { key: 'language', label: 'Language' },
      { key: 'weight_unit', label: 'Weight unit' },
      { key: 'distance_unit', label: 'Distance unit' },
    ],
  },
  {
    title: 'Data',
    items: [
      { key: 'export_strength', label: 'Export strength workouts' },
      { key: 'export_cardio', label: 'Export cardio' },
      { key: 'export_nutrition', label: 'Export nutrition' },
    ],
  },
  {
    title: 'App',
    items: [
      { key: 'help_support', label: 'Help & support' },
      { key: 'review_app', label: 'Review app' },
      { key: 'tos', label: 'Terms of service' },
      { key: 'privacy', label: 'Privacy policy' },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  const handlePressItem = (sectionKey: string, itemKey: string) => {
    // For now just a placeholder – you’ll wire these to popups later.
    console.log('Pressed setting', sectionKey, itemKey);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout failed', error.message);
      return;
    }

    // TODO: change this path to your actual auth screen if different
    router.replace('/(auth)/sign-in');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />{/* spacer to balance back icon */}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.row,
                    idx !== section.items.length - 1 && styles.rowBorder,
                  ]}
                  onPress={() =>
                    handlePressItem(section.title.toLowerCase(), item.key)
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={TEXT_MUTED}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '600',
  },

  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  rowLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
  },

  logoutContainer: {
    marginTop: 28,
  },
  logoutButton: {
    backgroundColor: '#1F2937',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DANGER,
  },
  logoutText: {
    color: DANGER,
    fontSize: 15,
    fontWeight: '600',
  },
});
