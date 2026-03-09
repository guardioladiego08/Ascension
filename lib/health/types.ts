export type HealthAuthorizationStatus =
  | 'authorized'
  | 'denied'
  | 'not_determined'
  | 'unavailable';

export type HealthProviderId = 'apple_health' | 'health_connect';

export type HealthAvailabilityStatus =
  | 'available'
  | 'unavailable'
  | 'provider_update_required';

export type HealthHeartRateSample = {
  sampleUuid: string | null;
  sampleStartAt: string;
  sampleEndAt: string;
  bpm: number;
  sourceName: string | null;
  sourceBundleId: string | null;
  deviceName: string | null;
  deviceModel: string | null;
  metadata: Record<string, unknown>;
};

export type HealthAuthorizationResult = {
  status: HealthAuthorizationStatus;
  error: string | null;
};

export type HealthProviderDescriptor = {
  providerId: HealthProviderId;
  providerLabel: string;
  connectTitle: string;
  connectBody: string;
  connectFootnote: string;
  manageCopy: string;
  settingsButtonLabel: string;
  unavailableButtonLabel: string;
};
