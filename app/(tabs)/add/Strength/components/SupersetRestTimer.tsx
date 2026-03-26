import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  formatRestTimerClock,
  getStrengthRestTimerProgress,
  type StrengthRestTimerState,
} from '@/lib/strength/restTimer';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

import StrengthRestTimerBar from './StrengthRestTimerBar';

type Props = {
  timer: StrengthRestTimerState;
  supersetId: string;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
};

const SupersetRestTimer: React.FC<Props> = ({
  timer,
  supersetId,
  onPause,
  onResume,
  onReset,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [nowMs, setNowMs] = useState(Date.now());

  const isVisible =
    timer.ownerKind === 'superset' &&
    timer.ownerId === supersetId &&
    timer.status !== 'idle';

  useEffect(() => {
    if (!isVisible || timer.status !== 'running') {
      return;
    }

    setNowMs(Date.now());
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => clearInterval(id);
  }, [isVisible, timer.endAtMs, timer.status]);

  if (!isVisible) {
    return null;
  }

  const progress = getStrengthRestTimerProgress(timer, nowMs);
  const statusLabel =
    timer.status === 'ready'
      ? 'Ready for next round'
      : timer.status === 'paused'
        ? 'Rest timer paused'
        : 'Rest timer';

  return (
    <StrengthRestTimerBar
      statusLabel={statusLabel}
      timeLabel={formatRestTimerClock(timer.remainingSeconds)}
      progress={progress}
      ready={timer.status === 'ready'}
      style={styles.wrap}
      footer={
        <View style={styles.controls}>
          {timer.status === 'running' ? (
            <TouchableOpacity
              activeOpacity={0.92}
              style={[styles.controlBtn, styles.secondaryBtn]}
              onPress={onPause}
            >
              <Ionicons name="pause" size={14} color={HOME_TONES.textPrimary} />
              <Text style={styles.secondaryText}>Pause</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.92}
              style={[
                styles.controlBtn,
                timer.status === 'ready' ? styles.primaryBtn : styles.secondaryBtn,
              ]}
              onPress={onResume}
            >
              <Ionicons
                name="play"
                size={14}
                color={timer.status === 'ready' ? colors.blkText : HOME_TONES.textPrimary}
              />
              <Text
                style={
                  timer.status === 'ready' ? styles.primaryText : styles.secondaryText
                }
              >
                {timer.status === 'ready' ? 'Restart' : 'Resume'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.controlBtn, styles.secondaryBtn]}
            onPress={onReset}
          >
            <Ionicons name="refresh" size={14} color={HOME_TONES.textPrimary} />
            <Text style={styles.secondaryText}>Reset</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      marginTop: 4,
    },
    controls: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    controlBtn: {
      minHeight: 36,
      borderRadius: 999,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    primaryBtn: {
      backgroundColor: colors.highlight1,
    },
    primaryText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
    secondaryBtn: {
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    secondaryText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}

export default SupersetRestTimer;
