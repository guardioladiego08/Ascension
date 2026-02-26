import React, { useState } from 'react';
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

import { useUnits } from '@/contexts/UnitsContext';
import WeightUnitModal from './settings/WeightUnitModal';
import DistanceUnitModal from './settings/DistanceUnitModal';
import ProfileDetailsModal from './settings/ProfileDetailsModal';


const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.text ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const DANGER = '#F97373';

export default function SettingsScreen() {
  const router = useRouter();
  const { weightUnit, distanceUnit } = useUnits();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [showProfileDetailsModal, setShowProfileDetailsModal] = useState(false);

  const handleComingSoon = (label: string) => {
    // placeholder until you wire actual popups
    Alert.alert(label, 'Configure options coming soon.');
  };

  const goToGoals = () => {
    router.push('./settings/goals');
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout failed', error.message);
      return;
    }
    // adjust this path to your auth route if different
    router.replace('../../SignInLogin/FirstPage');
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
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* GENERAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Notifications')}
            >
              <Text style={styles.rowLabel}>Notifications</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={goToGoals}
            >
              <Text style={styles.rowLabel}>Goal settings</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => setShowProfileDetailsModal(true)}
            >
              <Text style={styles.rowLabel}>Profile details</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => handleComingSoon('Advanced')}
            >
              <Text style={styles.rowLabel}>Advanced</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* STRENGTH */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strength</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Rest timer')}
            >
              <Text style={styles.rowLabel}>Rest timer</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => handleComingSoon('Warm-up settings')}
            >
              <Text style={styles.rowLabel}>Warm up settings</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* CARDIO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cardio</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleComingSoon('Speed or pace')}
            >
              <Text style={styles.rowLabel}>Speed or pace</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* UNITS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Language')}
            >
              <Text style={styles.rowLabel}>Language</Text>
              <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>

            {/* Weight unit with popup */}
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => setShowWeightModal(true)}
            >
              <Text style={styles.rowLabel}>Weight unit</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>
                  {weightUnit === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
              </View>
            </TouchableOpacity>

            {/* Distance unit with popup */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowDistanceModal(true)}
            >
              <Text style={styles.rowLabel}>Distance unit</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>
                  {distanceUnit === 'mi' ? 'Miles (mi)' : 'Kilometers (km)'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* DATA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Export strength workouts')}
            >
              <Text style={styles.rowLabel}>Export strength workouts</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Export cardio')}
            >
              <Text style={styles.rowLabel}>Export cardio</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => handleComingSoon('Export nutrition')}
            >
              <Text style={styles.rowLabel}>Export nutrition</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* APP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Help & support')}
            >
              <Text style={styles.rowLabel}>Help and support</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Review app')}
            >
              <Text style={styles.rowLabel}>Review app</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Terms of service')}
            >
              <Text style={styles.rowLabel}>Terms of service</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => handleComingSoon('Privacy policy')}
            >
              <Text style={styles.rowLabel}>Privacy policy</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
        {/* Weight unit modal */}
        <WeightUnitModal
          visible={showWeightModal}
          onClose={() => setShowWeightModal(false)}
        />

        {/* Distance unit modal */}
        <DistanceUnitModal
          visible={showDistanceModal}
          onClose={() => setShowDistanceModal(false)}
        />

        <ProfileDetailsModal
          visible={showProfileDetailsModal}
          onClose={() => setShowProfileDetailsModal(false)}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

// ---- styles ----

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
    rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    },
    rowValue: {
    color: TEXT_MUTED,
    fontSize: 12,
    },
});
