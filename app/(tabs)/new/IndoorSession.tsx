// app/(tabs)/new/IndoorSession.tsx
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

const IndoorSession: React.FC = () => {
  const router = useRouter();
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [incline, setIncline] = useState(0.0);
  const [speed, setSpeed] = useState(0.0);
  const [showConfirm, setShowConfirm] = useState(false);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const min = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>INDOOR RUN</Text>
      <View style={styles.underline} />

      <View style={styles.metricBox}>
        <Text style={styles.label}>Time</Text>
        <Text style={styles.value}>{formatTime(timer)}</Text>
      </View>

      <View style={styles.metricBox}>
        <Text style={styles.label}>Incline</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIncline(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1))))}>
            <Text style={styles.controlText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.controlValue}>{incline.toFixed(1)}</Text>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIncline(prev => parseFloat((prev + 0.1).toFixed(1)))}>
            <Text style={styles.controlText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metricBox}>
        <Text style={styles.label}>Speed</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setSpeed(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1))))}>
            <Text style={styles.controlText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.controlValue}>{speed.toFixed(1)}</Text>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setSpeed(prev => parseFloat((prev + 0.1).toFixed(1)))}>
            <Text style={styles.controlText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.pauseButton} onPress={() => setIsRunning(prev => !prev)}>
          <Text style={styles.buttonText}>{isRunning ? 'Pause' : 'Resume'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishButton} onPress={() => setShowConfirm(true)}>
          <Text style={styles.buttonText}>Finish</Text>
        </TouchableOpacity>
      </View>

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

export default IndoorSession;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#1e1e1e' },
  backButton: { marginBottom: 16 },
  backText: { color: '#FF950A', fontSize: 18 },
  title: { color: '#fff', fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  underline: { height: 1, backgroundColor: Colors.dark.text, marginVertical: 20 },
  metricBox: { marginBottom: 20 },
  label: { color: Colors.dark.text, fontSize: 20, marginBottom: 8 },
  value: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  controlRow: { flexDirection: 'row', alignItems: 'center' },
  controlButton: {
    backgroundColor: '#FF950A',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  controlText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  controlValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  pauseButton: { backgroundColor: '#444', padding: 12, borderRadius: 8 },
  finishButton: { backgroundColor: '#FF950A', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
});
