import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';

import { type CanonicalFoodRow, getFoodByBarcode } from '@/lib/nutrition/dataAccess';
import {
  isDuplicateBarcodeScan,
  normalizeScannedBarcode,
} from '@/lib/nutrition/barcode';

type CameraPermissionState = {
  granted: boolean;
  canAskAgain?: boolean;
} | null;

type BarcodeScanningResult = {
  data?: string | null;
};

type ExpoCameraModule = {
  CameraView?: ComponentType<any>;
  getCameraPermissionsAsync?: () => Promise<CameraPermissionState>;
  requestCameraPermissionsAsync?: () => Promise<CameraPermissionState>;
};

type UseNutritionBarcodeScannerArgs = {
  onMatch: (food: CanonicalFoodRow, barcode: string) => void;
  onNotFound: (barcode: string) => void;
};

type LoadedExpoCameraModule = {
  module: ExpoCameraModule | null;
  errorMessage: string | null;
};

const CAMERA_UNAVAILABLE_REASON =
  'Camera scanning is unavailable in this installed iOS build. Install the latest native build after adding expo-camera. OTA updates cannot add camera support.';

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return asStringOrNull(error.message) ?? fallback;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return asStringOrNull((error as { message?: unknown }).message) ?? fallback;
  }

  return asStringOrNull(error) ?? fallback;
}

function getCameraModuleCandidates(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  const candidates: Array<Record<string, unknown>> = [record];

  if (record.default && typeof record.default === 'object') {
    candidates.push(record.default as Record<string, unknown>);
  }

  if (record.Camera && typeof record.Camera === 'object') {
    candidates.push(record.Camera as Record<string, unknown>);
  }

  const defaultRecord =
    record.default && typeof record.default === 'object'
      ? (record.default as Record<string, unknown>)
      : null;

  if (defaultRecord?.Camera && typeof defaultRecord.Camera === 'object') {
    candidates.push(defaultRecord.Camera as Record<string, unknown>);
  }

  return candidates;
}

function getFunctionFromCandidates<T extends (...args: any[]) => any>(
  candidates: Array<Record<string, unknown>>,
  key: string
): T | undefined {
  for (const candidate of candidates) {
    const value = candidate[key];
    if (typeof value === 'function') {
      return value as T;
    }
  }

  return undefined;
}

function getComponentFromCandidates(
  candidates: Array<Record<string, unknown>>,
  key: string
): ComponentType<any> | undefined {
  for (const candidate of candidates) {
    const value = candidate[key];
    if (typeof value === 'function') {
      return value as ComponentType<any>;
    }
  }

  return undefined;
}

function loadExpoCameraModule(): LoadedExpoCameraModule {
  try {
    const rawModule = require('expo-camera');
    const candidates = getCameraModuleCandidates(rawModule);
    const CameraView = getComponentFromCandidates(candidates, 'CameraView');
    const getCameraPermissionsAsync = getFunctionFromCandidates<
      NonNullable<ExpoCameraModule['getCameraPermissionsAsync']>
    >(candidates, 'getCameraPermissionsAsync');
    const requestCameraPermissionsAsync = getFunctionFromCandidates<
      NonNullable<ExpoCameraModule['requestCameraPermissionsAsync']>
    >(candidates, 'requestCameraPermissionsAsync');

    if (!CameraView || !getCameraPermissionsAsync || !requestCameraPermissionsAsync) {
      return {
        module: null,
        errorMessage:
          'The installed expo-camera module is missing required exports. Install the latest native iOS build.',
      };
    }

    return {
      module: {
        CameraView,
        getCameraPermissionsAsync,
        requestCameraPermissionsAsync,
      },
      errorMessage: null,
    };
  } catch (error) {
    console.warn('[ScanFood] expo-camera is unavailable in the current native build', error);
    return {
      module: null,
      errorMessage: getErrorMessage(error, CAMERA_UNAVAILABLE_REASON),
    };
  }
}

export function useNutritionBarcodeScanner({
  onMatch,
  onNotFound,
}: UseNutritionBarcodeScannerArgs) {
  const loadedCameraModule = useMemo(() => loadExpoCameraModule(), []);
  const cameraModule = loadedCameraModule.module;
  const CameraView = cameraModule?.CameraView ?? null;

  const [permission, setPermission] = useState<CameraPermissionState>(null);
  const [paused, setPaused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [cameraSessionId, setCameraSessionId] = useState(0);
  const [cameraUnavailableReason, setCameraUnavailableReason] = useState<string | null>(
    loadedCameraModule.errorMessage
  );

  const lastResolvedScanRef = useRef<{
    value: string;
    atMs: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!cameraModule || typeof cameraModule.getCameraPermissionsAsync !== 'function') {
      setCameraUnavailableReason(CAMERA_UNAVAILABLE_REASON);
      return () => void 0;
    }

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
          getErrorMessage(error, 'Camera permissions could not be loaded in this build.')
        );
      });

    return () => {
      mounted = false;
    };
  }, [cameraModule]);

  const resetScanner = useCallback(() => {
    setPaused(false);
    setIsSearching(false);
    setLastCode(null);
    setNotFoundCode(null);
    setErrorText(null);
    setCameraSessionId((current) => current + 1);
    lastResolvedScanRef.current = null;
  }, []);

  const requestPermission = useCallback(async () => {
    if (!cameraModule || typeof cameraModule.requestCameraPermissionsAsync !== 'function') {
      setCameraUnavailableReason(CAMERA_UNAVAILABLE_REASON);
      return;
    }

    try {
      const response = await cameraModule.requestCameraPermissionsAsync();
      setPermission(response);
    } catch (error) {
      console.warn('[ScanFood] Failed to request camera permission', error);
      setCameraUnavailableReason(
        getErrorMessage(error, 'Camera permission could not be requested in this build.')
      );
    }
  }, [cameraModule]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      const scannedCode = normalizeScannedBarcode(data);
      if (!scannedCode || paused || isSearching) return;

      const nowMs = Date.now();
      const previous = lastResolvedScanRef.current;
      const elapsed = previous ? nowMs - previous.atMs : Number.POSITIVE_INFINITY;
      if (isDuplicateBarcodeScan(scannedCode, previous?.value ?? null, elapsed)) return;

      setPaused(true);
      setIsSearching(true);
      setLastCode(scannedCode);
      setNotFoundCode(null);
      setErrorText(null);

      try {
        const match = await getFoodByBarcode(scannedCode);
        lastResolvedScanRef.current = { value: scannedCode, atMs: Date.now() };

        if (!match) {
          setNotFoundCode(scannedCode);
          onNotFound(scannedCode);
          return;
        }

        onMatch(match, scannedCode);
      } catch (error) {
        console.warn('Error looking up scanned food barcode', error);
        setErrorText(
          error instanceof Error ? error.message : 'Could not search foods right now.'
        );
        setPaused(false);
      } finally {
        setIsSearching(false);
      }
    },
    [isSearching, onMatch, onNotFound, paused]
  );

  return {
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
  };
}
