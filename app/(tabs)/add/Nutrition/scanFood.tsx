import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import { findFoodByBarcode } from '@/lib/nutrition/foodLookup';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

type BarcodeScanningResult = {
  data?: string | null;
};

type CameraPermissionState = {
  granted: boolean;
  canAskAgain?: boolean;
} | null;

type ExpoCameraModule = typeof import('expo-camera');

function loadExpoCameraModule(): ExpoCameraModule | null {
  try {
    return require('expo-camera') as ExpoCameraModule;
  } catch (error) {
    console.warn('[ScanFood] expo-camera is unavailable in the current native build', error);
    return null;
  }
}

export default function ScanFood() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const cameraModule = useMemo(() => loadExpoCameraModule(), []);
  const CameraView = cameraModule?.CameraView ?? null;

  const [permission, setPermission] = useState<CameraPermissionState>(null);
  const [paused, setPaused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [cameraUnavailableReason, setCameraUnavailableReason] = useState<string | null>(
    cameraModule
      ? null
      : 'Camera scanning is unavailable in this iOS build. Rebuild the app after including expo-camera.'
  );

  useEffect(() => {
    let mounted = true;

    if (!cameraModule) return () => void 0;

    cameraModule
      .getCameraPermissionsAsync()
      .then((response) => {
        if (!mounted) return;
        setPermission(response);
      })
      .catch((error) => {
        console.warn('[ScanFood] Failed to read camera permissions', error);
        if (!mounted) return;
        setCameraUnavailableReason(
          'Camera scanning is unavailable in this iOS build. Rebuild the app after including expo-camera.'
        );
      });

    return () => {
      mounted = false;
    };
  }, [cameraModule]);

  useFocusEffect(
    useCallback(() => {
      setPaused(false);
      setIsSearching(false);
      setLastCode(null);
      setNotFoundCode(null);
      setErrorText(null);
    }, [])
  );

  const requestPermission = useCallback(async () => {
    if (!cameraModule) {
      setCameraUnavailableReason(
        'Camera scanning is unavailable in this iOS build. Rebuild the app after including expo-camera.'
      );
      return;
    }

    try {
      const response = await cameraModule.requestCameraPermissionsAsync();
      setPermission(response);
    } catch (error) {
      console.warn('[ScanFood] Failed to request camera permission', error);
      setCameraUnavailableReason(
        'Camera scanning is unavailable in this iOS build. Rebuild the app after including expo-camera.'
      );
    }
  }, [cameraModule]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      const scannedCode = data?.trim();
      if (!scannedCode || paused || isSearching) return;

      setPaused(true);
      setIsSearching(true);
      setLastCode(scannedCode);
      setNotFoundCode(null);
      setErrorText(null);

      try {
        const match = await findFoodByBarcode(scannedCode);
        if (!match) {
          setNotFoundCode(scannedCode);
          return;
        }

        router.push({
          pathname: './scanFoodResult',
          params: {
            foodId: match.id,
            barcode: scannedCode,
          },
        });
      } catch (error: any) {
        console.warn('Error looking up scanned food barcode', error);
        setErrorText(error?.message ?? 'Could not search foods right now.');
      } finally {
        setIsSearching(false);
      }
    },
    [isSearching, paused, router]
  );

  const handleScanAgain = () => {
    setPaused(false);
    setIsSearching(false);
    setLastCode(null);
    setNotFoundCode(null);
    setErrorText(null);
  };

  return (
    <View style={styles.page}>
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <View style={styles.main}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Barcode Scanner</Text>
            <Text style={styles.header}>Scan food</Text>
            <Text style={styles.heroText}>
              Scan packaged items and jump straight into the nutrition record if a
              match exists in your food database.
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
                  onPress={() => router.push('./addIngredient')}
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
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
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
                <Text style={styles.statusText}>Matching barcode with your foods database...</Text>
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
              For loose ingredients or unpackaged items, switch to manual search.
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
              style={[styles.buttonSecondary, styles.actionButton]}
              activeOpacity={0.9}
              onPress={() => router.push('./addIngredient')}
            >
              <Ionicons name="search" size={16} color={colors.text} />
              <Text style={styles.buttonTextSecondary}>Search Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
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
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.8,
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
      flex: 1,
      paddingTop: 8,
      gap: 14,
    },
    hero: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      padding: 22,
      gap: 8,
    },
    heroText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    cameraCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      overflow: 'hidden',
      minHeight: 340,
    },
    cameraWrap: {
      position: 'relative',
      width: '100%',
      height: 340,
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
      width: '74%',
      height: '34%',
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.highlight1,
      backgroundColor: 'rgba(0,0,0,0.14)',
    },
    scanHint: {
      marginTop: 16,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 28,
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
      marginTop: 16,
      minWidth: 160,
    },
    statusCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 16,
      gap: 8,
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
      lineHeight: 17,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      gap: 8,
    },
  });
}
