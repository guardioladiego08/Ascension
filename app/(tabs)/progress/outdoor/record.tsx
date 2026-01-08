import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';

// Ensure background task is defined (also import in app/_layout.tsx for best reliability)
import '@/lib/outdoor/backgroundLocationTask';

import type { OutdoorMode } from '@/lib/outdoor/types';
import { useOutdoorRecorder } from '@/lib/outdoor/useOutdoorRecorder';

import RecorderHeader from '../../add/Cardio/outdoor/RecorderHeader';
import PrimaryStats from '../../add/Cardio/outdoor/PrimaryStats';
import SecondaryStats from '../../add/Cardio/outdoor/SecondaryStats';
import RecorderControls from '../../add/Cardio/outdoor/RecorderControls';
import ConfirmSessionModal from '../../add/Cardio/outdoor/ConfirmSessionModal';
import LogoHeader from '@/components/my components/logoHeader';

const BG = Colors.dark.background;

export default function OutdoorRecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const mode = (params.mode as OutdoorMode) ?? 'outdoor_run';

  const {
    activityType,
    status,
    autoPauseEnabled,
    setAutoPauseEnabled,
    elapsedS,
    distanceM,
    elevGainM,
    currentPaceSecPerKm,
    currentSpeedMps,
    maxSpeedMps,
    start,
    pause,
    resume,
    lap,
    finish,
    cancel,
  } = useOutdoorRecorder({ mode });

  const title = useMemo(() => (activityType === 'run' ? 'OUTDOOR RUN' : 'OUTDOOR WALK'), [activityType]);

  const [finishOpen, setFinishOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <LogoHeader/>
      <View style={GlobalStyles.safeArea}>
        <RecorderHeader
          title={title}
          onBack={() => router.back()}
          autoPauseEnabled={autoPauseEnabled}
          onToggleAutoPause={() => setAutoPauseEnabled((v) => !v)}
        />

        <View style={styles.content}>
          <PrimaryStats elapsedS={elapsedS} distanceM={distanceM} paceSecPerKm={currentPaceSecPerKm} unit="mi" />
          <SecondaryStats elevGainM={elevGainM} currentSpeedMps={currentSpeedMps} maxSpeedMps={maxSpeedMps} />
        </View>

        <RecorderControls
          status={status}
          onStart={async () => {
            try {
              await start();
            } catch (e: any) {
              Alert.alert('Unable to start', e?.message ?? 'Unknown error');
            }
          }}
          onPause={() => pause()}
          onResume={() => resume()}
          onLap={() => lap()}
          onFinish={() => setFinishOpen(true)}
          onCancel={() => setCancelOpen(true)}
        />
      </View>

      <ConfirmSessionModal
        visible={finishOpen}
        title="Finish session?"
        message="This will save your run/walk and generate your summary."
        confirmText="Finish"
        onCancel={() => setFinishOpen(false)}
        onConfirm={async () => {
          setFinishOpen(false);
          try {
            const id = await finish();
            if (id) router.replace({ pathname: '/progress/outdoor/summary/[id]', params: { id } });
          } catch (e: any) {
            Alert.alert('Finish failed', e?.message ?? 'Unknown error');
          }
        }}
      />

      <ConfirmSessionModal
        visible={cancelOpen}
        title="Cancel session?"
        message="If you cancel, this session will be marked canceled. Samples may still exist for debugging."
        confirmText="Cancel session"
        destructive
        onCancel={() => setCancelOpen(false)}
        onConfirm={async () => {
          setCancelOpen(false);
          try {
            await cancel();
            router.back();
          } catch (e: any) {
            Alert.alert('Cancel failed', e?.message ?? 'Unknown error');
          }
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
});
