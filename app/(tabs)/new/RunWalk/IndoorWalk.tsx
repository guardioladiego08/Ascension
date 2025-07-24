// app/(tabs)/new/indoorWalk.tsx
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const IndoorWalk: React.FC = () => {
  const router = useRouter();

  // Timer state
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  // Control state
  const [incline, setIncline] = useState(7.5);
  const [speed, setSpeed] = useState(3.4);

  // Start / pause timer
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = () => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const adjust = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number
  ) => {
    setter(prev => parseFloat((prev + delta).toFixed(1)));
  };

  const handlePauseResume = () => {
    setIsRunning(r => !r);
  };

  const handleFinish = () => {
    router.push({
      pathname: '/new/RunWalk/indoorWalkSummary',
      params: { timeSeconds: seconds, incline, speed },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back-ios" size={24} color="#FFF" />
        </TouchableOpacity>
        <Image
          source={require('@/assets/images/Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>INDOOR WALK</Text>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        {[
          ['TIME', formatTime()],
          ['DISTANCE', '1.64 mi'],
          ['PACE', '10.21 min/mi'],
          ['ELEVATION', '920 ft'],
        ].map(([label, value], idx) => (
          <View key={label}>
            <View style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
            {idx < 3 && <View style={styles.separator} />}
          </View>
        ))}
      </View>

      {/* Controls Section */}
      <View style={styles.controlsSection}>
        <Text style={styles.controlLabel}>INCLINE</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjust(setIncline, -0.1)}
          >
            <Text style={styles.controlButtonText}>–</Text>
          </TouchableOpacity>
          <Text style={styles.controlValue}>{incline.toFixed(1)}</Text>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjust(setIncline, +0.1)}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.controlLabel, { marginTop: 16 }]}>SPEED</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjust(setSpeed, -0.1)}
          >
            <Text style={styles.controlButtonText}>–</Text>
          </TouchableOpacity>
          <Text style={styles.controlValue}>{speed.toFixed(1)}</Text>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjust(setSpeed, +0.1)}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handlePauseResume}
        >
          <Text style={styles.actionButtonText}>
            {isRunning ? 'PAUSE' : 'RESUME'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleFinish}
        >
          <Text style={styles.actionButtonText}>FINISH</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default IndoorWalk;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333333',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: {
    position: 'absolute',
    left: 16,
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  statsSection: {
    marginHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    color: '#FFF',
    fontSize: 16,
  },
  value: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#FFF',
    opacity: 0.3,
  },
  controlsSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  controlLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  controlButton: {
    backgroundColor: Colors.dark.highlight1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  controlButtonText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  controlValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 'auto',
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: Colors.dark.highlight1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
