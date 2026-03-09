import type { HealthProviderDescriptor, HealthProviderId } from '@/lib/health/types';

export function getHealthProviderDescriptor(
  providerId: HealthProviderId
): HealthProviderDescriptor {
  if (providerId === 'health_connect') {
    return {
      providerId,
      providerLabel: 'Health Connect',
      connectTitle: 'Connect Health Connect',
      connectBody:
        'Allow Ascension to read heart-rate samples from Android Health Connect for completed workouts and cardio sessions. If your watch or another fitness app writes heart-rate data into Health Connect, Ascension can use those raw samples for session charts.',
      connectFootnote:
        'Ascension reads heart rate only for completed sessions and your workout still saves normally if you do not allow access.',
      manageCopy:
        'You can turn sync off here anytime. To revoke access entirely, manage permissions in Health Connect.',
      settingsButtonLabel: 'Open Health Connect',
      unavailableButtonLabel: 'Get Health Connect',
    };
  }

  return {
    providerId,
    providerLabel: 'Apple Health',
    connectTitle: 'Connect Apple Health',
    connectBody:
      'Allow Ascension to read your Apple Health heart rate after you finish a workout. If your Apple Watch recorded heart-rate samples during that session, Ascension can attach those raw samples to the completed workout.',
    connectFootnote:
      'Ascension reads heart rate only for completed sessions and your workout still saves normally if you do not allow access.',
    manageCopy:
      'You can turn sync off here anytime. To revoke Apple Health permission entirely, manage access in the Health app or iPhone Settings.',
    settingsButtonLabel: 'Open iPhone Settings',
    unavailableButtonLabel: 'Open iPhone Settings',
  };
}

export const IOS_HEALTH_SHARE_USAGE_DESCRIPTION =
  'Ascension reads your Apple Health heart rate data to attach Apple Watch heart-rate samples to completed workouts.';
