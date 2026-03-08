import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { findFoodByBarcode } from '@/lib/nutrition/foodLookup';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export default function ScanFood() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [paused, setPaused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setPaused(false);
      setIsSearching(false);
      setLastCode(null);
      setNotFoundCode(null);
      setErrorText(null);
    }, [])
  );

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
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={GlobalStyles.safeArea}>
        <LogoHeader showBackButton />
        <View style={styles.main}>
          <Text style={GlobalStyles.header}>Scan Food</Text>

          <View style={styles.cameraCard}>
            {!permission ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={PRIMARY} />
                <Text style={styles.stateText}>Checking camera permission...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.centeredState}>
                <MaterialCommunityIcons name="barcode-scan" size={28} color={TEXT_PRIMARY} />
                <Text style={styles.stateTitle}>Camera access is required</Text>
                <Text style={styles.stateText}>
                  Allow camera access to scan product barcodes and match foods.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  activeOpacity={0.9}
                  onPress={() => requestPermission()}
                >
                  <Text style={styles.primaryButtonText}>Enable Camera</Text>
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
                </View>
              </View>
            )}
          </View>

          <View style={styles.statusCard}>
            {isSearching ? (
              <View style={styles.statusRow}>
                <ActivityIndicator color={PRIMARY} />
                <Text style={styles.statusText}>Matching barcode with your foods database...</Text>
              </View>
            ) : null}

            {notFoundCode ? (
              <Text style={styles.statusText}>
                No match found for barcode <Text style={styles.statusCode}>{notFoundCode}</Text>.
              </Text>
            ) : null}

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            {lastCode && !notFoundCode && !errorText && !isSearching ? (
              <Text style={styles.statusText}>
                Last scanned code: <Text style={styles.statusCode}>{lastCode}</Text>
              </Text>
            ) : null}

            <Text style={styles.hintText}>
              Place the barcode inside the frame and hold steady.
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.9}
              onPress={handleScanAgain}
              disabled={isSearching}
            >
              <Ionicons name="refresh" size={16} color={TEXT_PRIMARY} />
              <Text style={styles.secondaryButtonText}>Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.9}
              onPress={() => router.push('./addIngredient')}
            >
              <Ionicons name="search" size={16} color={TEXT_PRIMARY} />
              <Text style={styles.secondaryButtonText}>Search Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  cameraCard: {
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#26324A',
    backgroundColor: CARD,
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
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCorners: {
    width: '74%',
    height: '34%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  stateTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  stateText: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#05101F',
    fontWeight: '800',
    fontSize: 13,
  },
  statusCard: {
    marginTop: 14,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A3A',
    padding: 14,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    lineHeight: 18,
  },
  hintText: {
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  statusCode: {
    color: PRIMARY,
    fontWeight: '800',
  },
  errorText: {
    color: '#FF6B81',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#26324A',
    backgroundColor: CARD,
    gap: 6,
  },
  secondaryButtonText: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
    fontSize: 13,
  },
});
