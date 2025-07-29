import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/Colors';

const IndoorRun = forwardRef<BottomSheetModal>((_, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [incline, setIncline] = useState(0.0);
  const [speed, setSpeed] = useState(0.0);
  const [showConfirm, setShowConfirm] = useState(false);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  useImperativeHandle(ref, () => ({
    present: () => {
      resetSession();
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      stopTimer();
      bottomSheetRef.current?.dismiss();
    },
  }));

  const resetSession = () => {
    setTimer(0);
    setIncline(0.0);
    setSpeed(0.0);
    setShowConfirm(false);
    setIsRunning(true);
    startTimer();
  };

  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const min = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  };

  useEffect(() => {
    if (isRunning) startTimer();
    else stopTimer();
    return stopTimer;
  }, [isRunning]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['15%', '100%']}
      index={1}
      enablePanDownToClose={false}
      backgroundStyle={{ borderRadius: 0 }}
    >
      <BottomSheetView style={styles.container}>

        <Text style={styles.title}>INDOOR RUN</Text>

        <View style={styles.underline} />
        <View style={styles.metricBox}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>{formatTime(timer)}</Text>
        </View>
        <View style={styles.underline} />

        <View style={styles.metricBox}>
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>1.65</Text>
        </View>
        <View style={styles.underline} />

        <View style={styles.metricBox}>
          <Text style={styles.label}>Pace</Text>
          <Text style={styles.value}>9:45</Text>
        </View>
        <View style={styles.underline} />
        <View  style={styles.metric2container}>
          <View style={styles.metricBox2}>
            <Text style={styles.label}>Incline</Text>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setIncline(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1))))}>
                <Text style={styles.controlText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.controlValue}>{incline.toFixed(1)}</Text>
              <TouchableOpacity style={styles.controlButton} onPress={() => setIncline(prev => parseFloat((prev + 0.1).toFixed(1)))}>
                <Text style={styles.controlText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        
          <View style={styles.metricBox2}>
            <Text style={styles.label}>Speed</Text>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setSpeed(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1))))}>
                <Text style={styles.controlText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.controlValue}>{speed.toFixed(1)}</Text>
              <TouchableOpacity style={styles.controlButton} onPress={() => setSpeed(prev => parseFloat((prev + 0.1).toFixed(1)))}>
                <Text style={styles.controlText}>+</Text>
              </TouchableOpacity>
            </View>
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
          <View style={styles.sheetOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>Are you sure you're finished?</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity onPress={() => setShowConfirm(false)} style={styles.confirmBtn}>
                  <Text style={styles.buttonText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowConfirm(false);
                    bottomSheetRef.current?.dismiss();
                    // Future: Trigger summary modal here
                  }}
                  style={styles.confirmBtn}
                >
                  <Text style={styles.buttonText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default IndoorRun;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#1e1e1e',
    height: 800
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 35,
    marginBottom: 30,
    textAlign: 'center',
  },
  metric2container:{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    alignItems: 'center'
  },
  metricBox2: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 24,
    alignItems: 'center'
  },
  label: {
    color: Colors.dark.text,
    fontSize: 28,
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    backgroundColor: '#FF950A',
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  controlText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  controlValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 32,
  },
  pauseButton: {
    backgroundColor: '#444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  finishButton: {
    backgroundColor: '#FF950A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBox: {
    backgroundColor: '#333',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  confirmBtn: {
    backgroundColor: '#555',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  underline: {
    height: 1,
    backgroundColor: Colors.dark.text,
    marginTop: 4,
    marginBottom: 26,
  },
});
