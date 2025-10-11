// app/(tabs)/new/IndoorSession.tsx
// -----------------------------------------------------------------------------
// Indoor run session with TIME, DISTANCE, and PACE sections.
// Records data points every 10s into a local buffer.
// On Finish, pushes summary + all samples to Supabase in bulk.
// Requires explicit user_id passed for RLS insert.
// -----------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import LogoHeader from '@/components/my components/logoHeader';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

type SamplePoint = { t: number; dist: number; pace: number; incline: number; elevation: number };

const MetricRow = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <View style={styles.metricBlock}>
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <View style={styles.metricValueWrap}>
        <Text style={styles.metricValue}>{value}</Text>
        {unit && <Text style={styles.metricUnit}>{unit}</Text>}
      </View>
    </View>
    <View style={styles.underline} />
  </View>
);

const IndoorSession: React.FC = () => {
  const router = useRouter();

  // State
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [incline, setIncline] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);

  // Buffer for samples
  const [samples, setSamples] = useState<SamplePoint[]>([]);

  // Session ID
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Finish overlay
  const [showConfirm, setShowConfirm] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const intervalRef = useRef<NodeJS.Timer | null>(null);

  // --- Create session row on mount (explicit user_id) ---
  useEffect(() => {
    const createSession = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      console.log("USER:", user);

      if (authError || !user) {
        Alert.alert('Error', 'You must be signed in to start a session.');
        return;
      }

      const { data, error } = await supabase
        .from('cardio_sessions')
        .insert({ type: 'indoor', user_id: user.id }) // ✅ explicit user_id
        .select()
        .single();

      if (error) {
        console.error(error);
        Alert.alert('Error', 'Could not start session.');
      } else {
        setSessionId(data.id);
      }
    };
    createSession();
  }, []);

  // --- Main ticker (1s updates) ---
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
        setDistance((d) => d + speed / 3600); // mph → miles/sec
      }, 1000);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [isRunning, speed]);

  // --- Every 10s, save sample locally ---
  useEffect(() => {
    if (isRunning && seconds > 0 && seconds % 10 === 0) {
      const pace = distance > 0 ? (seconds / 60) / distance : 0;
      const elevation = incline * distance * 5; // simple calc
      setSamples((prev) => [...prev, { t: seconds, dist: distance, pace, incline, elevation }]);
    }
  }, [seconds]);

  // --- On Finish: bulk save samples + update session ---
  const finishSession = async () => {
    if (!sessionId) return;
    setIsFinishing(true);

    try {
      // bulk insert samples
      if (samples.length) {
        const rows = samples.map((s) => ({
          session_id: sessionId,
          recorded_at: new Date(Date.now() - (seconds - s.t) * 1000).toISOString(),
          seconds_from_start: s.t,
          distance: s.dist,
          pace: s.pace,
          incline: s.incline,
          elevation: s.elevation,
        }));
        const { error: sampleErr } = await supabase.from('cardio_samples').insert(rows);
        if (sampleErr) throw sampleErr;
      }

      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      // update session summary
      const { error: sessErr } = await supabase
        .from('cardio_sessions')
        .update({
          ended_at: new Date().toISOString(),
          total_time: `${seconds} seconds`,
          total_distance: distance,
          avg_pace: avg(samples.map((s) => s.pace)),
          avg_incline: avg(samples.map((s) => s.incline)) || incline,
          avg_elevation: avg(samples.map((s) => s.elevation)) || incline * distance * 5,
        })
        .eq('id', sessionId);

      if (sessErr) throw sessErr;

      setShowConfirm(false);
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not save session.');
    } finally {
      setIsFinishing(false);
    }
  };

  const pace = distance > 0 ? (seconds / 60) / distance : 0;
  const dec = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '--');

  return (
    <View style={GlobalStyles.container}>
      <LogoHeader showBackButton />
      <Text style={styles.title}>INDOOR RUN</Text>

      <MetricRow label="Time" value={formatTime(seconds)} />
      <MetricRow label="Distance" value={dec(distance)} unit="MI" />
      <MetricRow label="Pace" value={dec(pace)} unit="MIN/MI" />

      {/* Controls */}
      <View style={styles.dualControls}>
        <View style={styles.controlCol}>
          <Text style={styles.controlLabel}>INCLINE</Text>
          <View style={styles.controlRow}>
            <CircleBtn onPress={() => setIncline((v) => Math.max(0, +(v - 0.1).toFixed(1)))} label="-" />
            <Text style={styles.controlValue}>{incline.toFixed(1)}</Text>
            <CircleBtn onPress={() => setIncline((v) => +(v + 0.1).toFixed(1))} label="+" />
          </View>
        </View>
        <View style={styles.controlCol}>
          <Text style={styles.controlLabel}>SPEED</Text>
          <View style={styles.controlRow}>
            <CircleBtn onPress={() => setSpeed((v) => Math.max(0, +(v - 0.1).toFixed(1)))} label="-" />
            <Text style={styles.controlValue}>{speed.toFixed(1)}</Text>
            <CircleBtn onPress={() => setSpeed((v) => +(v + 0.1).toFixed(1))} label="+" />
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.pauseBtn]} onPress={() => setIsRunning((p) => !p)}>
          <Text style={styles.actionText}>{isRunning ? 'PAUSE' : 'RESUME'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.finishBtn]} onPress={() => setShowConfirm(true)}>
          <Text style={styles.actionTextFInish}>FINISH</Text>
        </TouchableOpacity>
      </View>

      {/* Finish popup */}
      {showConfirm && (
        <View style={styles.overlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>Are you sure you’re finished?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity disabled={isFinishing} onPress={() => setShowConfirm(false)} style={styles.confirmBtn}>
                <Text style={styles.buttonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isFinishing} onPress={finishSession} style={[styles.confirmBtn, isFinishing && { opacity: 0.5 }]}>
                <Text style={styles.buttonText}>{isFinishing ? 'Saving...' : 'Yes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const CircleBtn = ({ onPress, label }: { onPress: () => void; label: string }) => (
  <TouchableOpacity style={styles.circleBtn} onPress={onPress}>
    <Text style={styles.circleBtnText}>{label}</Text>
  </TouchableOpacity>
);

export default IndoorSession;

// --- Styles (same as before) ---
const styles = StyleSheet.create({
  title: { ...GlobalStyles.header, textAlign: 'center', letterSpacing: 1, marginBottom: 8 },
  metricBlock: { paddingHorizontal: 20, marginTop: 10 },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 12 },
  metricLabel: { color: Colors.dark.text, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  metricValueWrap: { flexDirection: 'row', alignItems: 'flex-end' },
  metricValue: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: 1 },
  metricUnit: { color: Colors.dark.text, fontSize: 14, marginLeft: 6, marginBottom: 6, fontWeight: '700' },
  underline: { height: 1, backgroundColor: '#6a6a6a', opacity: 0.6, marginTop: 10 },
  dualControls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 14 },
  controlCol: { width: '48%' },
  controlLabel: { alignSelf: 'center', color: Colors.dark.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2b2b2b', borderWidth: 1, borderColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  circleBtnText: { color: '#f2f2f2', fontSize: 18, fontWeight: '900' },
  controlValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 24 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  pauseBtn: { backgroundColor: '#000', marginRight: 12 },
  finishBtn: { backgroundColor: Colors.dark.highlight1, marginLeft: 12 },
  actionText: { color: Colors.dark.text, fontSize: 16, fontWeight: '800' },
  actionTextFInish: { color: Colors.dark.blkText, fontSize: 16, fontWeight: '800' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#333', padding: 24, borderRadius: 12, width: '80%' },
  confirmText: { color: '#fff', fontSize: 18, marginBottom: 16, textAlign: 'center' },
  confirmButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmBtn: { backgroundColor: '#555', padding: 12, borderRadius: 8, marginHorizontal: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
