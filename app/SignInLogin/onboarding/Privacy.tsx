// app/SignInLogin/onboarding/Privacy.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.highlight3;
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';

type PolicyModalProps = {
  visible: boolean;
  onClose: () => void;
};

function TermsModal({ visible, onClose }: PolicyModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Terms of Use</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalBodyText}>
              These Terms of Use govern your use of the Tensr app and services.
              By creating an account or using Tensr, you agree that:
            </Text>
            <Text style={styles.modalBodyText}>
              • You are responsible for all activity under your account.{'\n'}
              • Tensr is not a substitute for professional medical advice.{'\n'}
              • You will use the app only for personal, lawful purposes and will
              respect other users.
            </Text>
            <Text style={styles.modalBodyText}>
              The full, legally binding version of these terms will be available
              inside the app and on our website. Using Tensr means you accept
              the latest version of our Terms of Use.
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PrivacyPolicyModal({ visible, onClose }: PolicyModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalBodyText}>
              Our Privacy Policy explains what data we collect, how we use it,
              and the choices you have.
            </Text>
            <Text style={styles.modalBodyText}>
              • We collect information you provide (like profile details,
              workouts, and nutrition logs).{'\n'}
              • We use this to power insights, recommendations, and social
              features within Tensr.{'\n'}
              • You can change what you share or request data removal from
              within the app.
            </Text>
            <Text style={styles.modalBodyText}>
              The full policy, including your rights and data retention details,
              will be available in the app and on our website. By continuing,
              you agree to this Privacy Policy.
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function Privacy() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authUserId?: string }>();
  const authUserId = Array.isArray(params.authUserId)
    ? params.authUserId[0]
    : params.authUserId;

  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleContinue = async () => {
    if (!authUserId) {
      Alert.alert('Error', 'No user ID found. Please log in again.');
      return;
    }
    if (!accepted) {
      Alert.alert(
        'Please confirm',
        'You must acknowledge our privacy policy to continue.',
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .schema('user')
      .from('profiles')
      .update({
        privacy_accepted: true,
      })
      .eq('auth_user_id', authUserId);

    setSaving(false);

    if (error) {
      console.log('save privacy error', error);
      Alert.alert('Error', error.message);
      return;
    }

    router.push({
      pathname: './Paywall',
      params: { authUserId },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color={TEXT_MUTED}
          />
          <Text style={styles.headerTitle}>Your privacy</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.bodyText}>
          We take your data privacy seriously. Tensr only uses your data to help
          you track your training, understand your performance, and connect with
          friends if you choose.
        </Text>
        <Text style={[styles.bodyText, { marginTop: 8 }]}>
          You can adjust what you share at any time in Settings. Please review
          our full Terms of Use and Privacy Policy in the app.
        </Text>

        {/* Links to open popups */}
        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => setShowTerms(true)}>
            <Text style={styles.linkText}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={styles.linkSeparator}>•</Text>
          <TouchableOpacity onPress={() => setShowPrivacy(true)}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.checkboxRow]}
          onPress={() => setAccepted((x) => !x)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && (
              <Ionicons name="checkmark" size={14} color="#020817" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand how my data is used and agree to the Privacy Policy.
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, saving && { opacity: 0.7 }]}
        onPress={handleContinue}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#020817" />
        ) : (
          <Text style={styles.primaryText}>Continue</Text>
        )}
      </TouchableOpacity>

      {/* Popups */}
      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicyModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 20, paddingTop: 8 },
  header: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, color: TEXT_PRIMARY, fontWeight: '700' },

  card: { backgroundColor: CARD, borderRadius: 18, padding: 18 },
  bodyText: { color: TEXT_PRIMARY, fontSize: 14, lineHeight: 20 },

  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  linkText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  linkSeparator: {
    color: TEXT_MUTED,
    fontSize: 13,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3A465E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  checkboxLabel: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#020817', fontWeight: '600', fontSize: 15 },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E2838',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  modalBodyText: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  modalButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  modalButtonText: {
    color: '#020817',
    fontWeight: '600',
    fontSize: 13,
  },
});
