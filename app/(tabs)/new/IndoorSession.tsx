// app/(tabs)/new/IndoorSession.tsx
// -----------------------------------------------------------------------------
// Indoor run session with TIME, DISTANCE, and PACE sections (each separated
// by underlines like your mock), plus Incline/Speed controls and Pause/Finish.
// TIME is large and right-aligned; DISTANCE and PACE mirror the same layout.
// Distance auto-calculates while running. Pace is computed as min/mi.
// -----------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import LogoHeader from '@/components/my components/logoHeader';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

const formatTime = (seconds: number) => {
  const min = String(Math.floor(seconds / 60)).padStart(2, '0');
  const sec = String(seconds % 60).padStart(2, '0');
  return `${min}:${sec}`;
};

// Reusable metric row (label on left, big value on right, underline below)
const MetricRow: React.FC<{
  label: string;
  value: string;
  unit?: string;
  underline?: boolean;
}> = ({ label, value, unit, underline = true }) => (
  <View style={styles.metricBlock}>
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <View style={styles.metricValueWrap}>
        <Text style={styles.metricValue}>{value}</Text>
        {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
      </View>
    </View>
    {underline && <View style={styles.underline} />}
  </View>
);

const IndoorSession: React.FC = () => {
  const router = useRouter();

  // Timer / motion
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Controls
  const [incline, setIncline] = useState(0.0); // %
  const [speed, setSpeed] = useState(0.0);     // mph (used to synthesize distance)

  // Derived
  const [distance, setDistance] = useState(0); // miles (auto-updates while running)

  // Finish overlay
  const [showConfirm, setShowConfirm] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick: 1Hz
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        // advance time
        setSeconds((s) => s + 1);
        // advance distance using mph -> miles/second
        setDistance((d) => d + speed / 3600);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isRunning, speed]);

  const paceMinPerMi = distance > 0 ? (seconds / 60) / distance : 0; // min/mi

  const dec = (n: number, p = 2) => Number.isFinite(n) ? n.toFixed(p) : '0.00';

  return (
    <View style={GlobalStyles.container}>
      {/* Back button + logo */}
      <LogoHeader showBackButton />

      {/* Screen title */}
      <Text style={styles.title}>INDOOR RUN</Text>

      {/* TIME / DISTANCE / PACE */}
      <MetricRow label="Time" value={formatTime(seconds)} />
      <MetricRow label="Distance" value={dec(distance, 2)} unit="MI" />
      <MetricRow label="Pace" value={distance > 0 ? dec(paceMinPerMi, 2) : '--'} unit="MIN/MI" />

      {/* Controls: Incline & Speed */}
      <View style={styles.dualControls}>
        {/* INCLINE */}
        <View style={styles.controlCol}>
          <Text style={styles.controlLabel}>INCLINE</Text>
          <View style={styles.controlRow}>
            <CircleBtn onPress={() => setIncline((v) => Math.max(0, +(v - 0.1).toFixed(1)))} label="-" />
            <Text style={styles.controlValue}>{incline.toFixed(1)}</Text>
            <CircleBtn onPress={() => setIncline((v) => +(v + 0.1).toFixed(1))} label="+" />
          </View>
        </View>

        {/* SPEED */}
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

      {/* Finish overlay */}
      {showConfirm && (
        <View style={styles.overlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>Are you sure you’re finished?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity onPress={() => setShowConfirm(false)} style={styles.confirmBtn}>
                <Text style={styles.buttonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={styles.confirmBtn}>
                <Text style={styles.buttonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const CircleBtn: React.FC<{ onPress: () => void; label: string }> = ({ onPress, label }) => (
  <TouchableOpacity style={styles.circleBtn} onPress={onPress}>
    <Text style={styles.circleBtnText}>{label}</Text>
  </TouchableOpacity>
);

export default IndoorSession;

const styles = StyleSheet.create({
  title: {
    ...GlobalStyles.header,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 8,
  },

  // metric rows
  metricBlock: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  metricLabel: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  metricValueWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  metricValue: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metricUnit: {
    color: Colors.dark.text,
    fontSize: 14,
    marginLeft: 6,
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 1,
  },
  underline: {
    height: 1,
    backgroundColor: '#6a6a6a',
    opacity: 0.6,
    marginTop: 10,
  },

  // controls
  dualControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 14,
  },
  controlCol: {
    width: '48%',
  },
  controlLabel: {
    alignSelf: 'center',
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 1,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2b2b2b',
    borderWidth: 1,
    borderColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBtnText: {
    color: '#f2f2f2',
    fontSize: 18,
    fontWeight: '900',
  },
  controlValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },

  // actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  pauseBtn: {
    backgroundColor: '#000000ff',
    marginRight: 12,
  },
  finishBtn: {
    backgroundColor: Colors.dark.highlight1,
    marginLeft: 12,
  },
  actionText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionTextFInish: {
    color: Colors.dark.blkText,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },


  // overlay
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBox: { backgroundColor: '#333', padding: 24, borderRadius: 12, width: '80%' },
  confirmText: { color: '#fff', fontSize: 18, marginBottom: 16, textAlign: 'center' },
  confirmButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmBtn: { backgroundColor: '#555', padding: 12, borderRadius: 8, marginHorizontal: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
