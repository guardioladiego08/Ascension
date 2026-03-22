import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import { NUTRITION_BARCODE_TYPES } from '@/lib/nutrition/barcode';
import { NUTRITION_ROUTES } from '@/lib/nutrition/navigation';
import { useNutritionBarcodeScanner } from './hooks/useNutritionBarcodeScanner';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

export default function ScanFood() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const {
    CameraView,
    permission,
    paused,
    isSearching,
    lastCode,
    notFoundCode,
    errorText,
    cameraSessionId,
    cameraUnavailableReason,
    requestPermission,
    handleBarcodeScanned,
    resetScanner,
  } = useNutritionBarcodeScanner({
    onMatch: (food, scannedCode) => {
      router.replace({
        pathname: NUTRITION_ROUTES.logFood,
        params: {
          foodId: food.id,
          barcode: scannedCode,
        },
      });
    },
    onNotFound: () => {},
  });

  useFocusEffect(
    useCallback(() => {
      resetScanner();
    }, [resetScanner])
  );

  const handleScanAgain = () => {
    resetScanner();
  };

  const handleCaptureLabels = () => {
    const barcode = notFoundCode ?? lastCode ?? undefined;

    router.replace({
      pathname: NUTRITION_ROUTES.scanFoodFallback,
      params: barcode ? { barcode } : {},
    });
  };

  return (
    <View style={styles.page}>
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.main}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Barcode Scanner</Text>
            <Text style={styles.header}>Scan food</Text>
            <Text style={styles.heroText}>
              Scan packaged items or jump to nutrition label capture any time.
            </Text>
          </View>

          <View style={styles.cameraCard}>
            {cameraUnavailableReason || !CameraView ? (
              <View style={styles.centeredState}>
                <MaterialCommunityIcons
                  name="camera-off"
                  size={30}
                  color={colors.text}
                />
                <Text style={styles.stateTitle}>Camera unavailable</Text>
                <Text style={styles.stateText}>{cameraUnavailableReason}</Text>
                <TouchableOpacity
                  style={[styles.buttonSecondary, styles.permissionButton]}
                  activeOpacity={0.9}
                  onPress={() => router.replace(NUTRITION_ROUTES.logFood)}
                >
                  <Text style={styles.buttonTextSecondary}>Search Manually</Text>
                </TouchableOpacity>
              </View>
            ) : !permission ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={colors.highlight1} />
                <Text style={styles.stateText}>Checking camera permission...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.centeredState}>
                <MaterialCommunityIcons
                  name="barcode-scan"
                  size={30}
                  color={colors.text}
                />
                <Text style={styles.stateTitle}>Camera access is required</Text>
                <Text style={styles.stateText}>
                  Allow camera access to scan product barcodes and match foods.
                </Text>
                <TouchableOpacity
                  style={[styles.buttonPrimary, styles.permissionButton]}
                  activeOpacity={0.9}
                  onPress={() => requestPermission()}
                >
                  <Text style={styles.buttonTextPrimary}>Enable Camera</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraWrap}>
                <CameraView
                  key={`nutrition-camera-${cameraSessionId}`}
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: [...NUTRITION_BARCODE_TYPES] }}
                  onBarcodeScanned={paused || isSearching ? undefined : handleBarcodeScanned}
                />
                <View pointerEvents="none" style={styles.scanFrame}>
                  <View style={styles.scanCorners} />
                  <Text style={styles.scanHint}>Align barcode inside the frame</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.statusCard}>
            {isSearching ? (
              <View style={styles.statusRow}>
                <ActivityIndicator color={colors.highlight1} />
                <Text style={styles.statusText}>
                  Matching barcode with the canonical food catalog...
                </Text>
              </View>
            ) : null}

            {notFoundCode ? (
              <Text style={styles.statusText}>
                No match found for <Text style={styles.statusCode}>{notFoundCode}</Text>.
              </Text>
            ) : null}

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            {lastCode && !notFoundCode && !errorText && !isSearching ? (
              <Text style={styles.statusText}>
                Last scanned code: <Text style={styles.statusCode}>{lastCode}</Text>
              </Text>
            ) : null}

            <Text style={styles.hintText}>
              If a barcode does not match, capture the nutrition label and submit it.
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.buttonSecondary, styles.actionButton]}
              activeOpacity={0.9}
              onPress={handleScanAgain}
              disabled={isSearching}
            >
              <Ionicons name="refresh" size={16} color={colors.text} />
              <Text style={styles.buttonTextSecondary}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonPrimary, styles.actionButton]}
              activeOpacity={0.9}
              onPress={handleCaptureLabels}
            >
              <Ionicons name="camera-outline" size={16} color={colors.blkText} />
              <Text style={styles.buttonTextPrimary}>Capture Nutrition Facts</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.manualLink}
            activeOpacity={0.9}
            onPress={() => router.replace(NUTRITION_ROUTES.logFood)}
          >
            <Ionicons name="search" size={14} color={HOME_TONES.textSecondary} />
            <Text style={styles.manualLinkText}>Search manually instead</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: HOME_TONES.background,
    },
    scroll: {
      flex: 1,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    header: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 31,
      letterSpacing: -0.6,
    },
    buttonPrimary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.highlight1,
      borderWidth: 1,
      borderColor: colors.highlight1,
      flexDirection: 'row',
    },
    buttonSecondary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      flexDirection: 'row',
    },
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonTextSecondary: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    main: {
      paddingTop: 6,
      paddingBottom: 18,
      gap: 10,
    },
    hero: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 18,
      paddingVertical: 16,
      gap: 6,
    },
    heroText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    cameraCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      overflow: 'hidden',
      minHeight: 250,
    },
    cameraWrap: {
      position: 'relative',
      width: '100%',
      height: 250,
    },
    camera: {
      flex: 1,
    },
    scanFrame: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanCorners: {
      width: '72%',
      height: '36%',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.highlight1,
      backgroundColor: 'rgba(0,0,0,0.14)',
    },
    scanHint: {
      marginTop: 12,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    stateTitle: {
      marginTop: 12,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
      textAlign: 'center',
    },
    stateText: {
      marginTop: 8,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    permissionButton: {
      marginTop: 12,
      minWidth: 160,
    },
    statusCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    statusCode: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    hintText: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      gap: 8,
    },
    manualLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 2,
    },
    manualLinkText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
  });
}
