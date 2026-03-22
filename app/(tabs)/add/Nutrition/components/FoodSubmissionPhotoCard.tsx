import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type FoodSubmissionPhotoCardProps = {
  label: string;
  helperText: string;
  required?: boolean;
  imageUri: string | null;
  loading?: boolean;
  onCapture: () => void;
};

export default function FoodSubmissionPhotoCard({
  label,
  helperText,
  required = false,
  imageUri,
  loading = false,
  onCapture,
}: FoodSubmissionPhotoCardProps) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.label}>
            {label}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
          <Text style={styles.helperText}>{helperText}</Text>
        </View>

        <TouchableOpacity
          style={styles.captureButton}
          activeOpacity={0.9}
          onPress={onCapture}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={15} color={colors.text} />
              <Text style={styles.captureLabel}>{imageUri ? 'Retake' : 'Capture'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons name="image-outline" size={24} color={colors.textMuted} />
          <Text style={styles.placeholderText}>No photo captured yet.</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 12,
      gap: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    label: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    required: {
      color: colors.danger,
    },
    helperText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    captureButton: {
      minHeight: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    captureLabel: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 15,
    },
    preview: {
      width: '100%',
      height: 170,
      borderRadius: 12,
    },
    placeholder: {
      width: '100%',
      height: 170,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    placeholderText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
