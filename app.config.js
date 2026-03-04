// app.config.ts
import 'dotenv/config';
import type { ExpoConfig, ConfigContext } from 'expo/config';

const IOS_HEALTH_SHARE_USAGE_DESCRIPTION =
  'Ascension reads your Apple Health heart rate data to attach Apple Watch heart-rate samples to completed strength workouts.';
const IOS_HEALTH_UPDATE_USAGE_DESCRIPTION =
  'Ascension uses Apple Health permissions to support heart-rate syncing for completed strength workouts.';

export default ({ config }: ConfigContext): ExpoConfig => {
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  return {
    ...config,

    name: 'Tensr Fitness',
    slug: 'tensr-fitness',
    owner: 'dguardiola01',
    scheme: 'tensr',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',

    icon: './assets/images/icon.png',
    assetBundlePatterns: ['**/*'],

    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },

    ios: {
      ...(config.ios ?? {}),
      bundleIdentifier: 'com.alterastudio.ascension',
      supportsTablet: true,

      /**
       * ✅ This generates Info.plist:
       * UIBackgroundModes = ["location"]
       * Required for Location.startLocationUpdatesAsync(...)
       */
      backgroundModes: ['location'],

      infoPlist: {
        ...(config.ios?.infoPlist ?? {}),

        // Foreground prompt
        NSLocationWhenInUseUsageDescription:
          'Tensr uses your location to record outdoor runs and walks.',

        // Background prompts (required if you request background permission / run background tasks)
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Tensr uses your location in the background to continue recording outdoor sessions.',
        NSLocationAlwaysUsageDescription:
          'Tensr uses your location in the background to continue recording outdoor sessions.',

        // Optional (improves activity context)
        NSMotionUsageDescription:
          'Tensr uses motion data to improve the accuracy of outdoor session tracking.',
        NSHealthShareUsageDescription: IOS_HEALTH_SHARE_USAGE_DESCRIPTION,
        NSHealthUpdateUsageDescription: IOS_HEALTH_UPDATE_USAGE_DESCRIPTION,
      },
    },

    android: {
      ...(config.android ?? {}),
      package: 'com.tensrfitness.app',

      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#000000',
      },

      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
      ],

      // Only needed if you use Google Maps (react-native-maps). Safe to keep.
      config: {
        googleMaps: {
          apiKey: process.env.ANDROID_MAPS_API_KEY,
        },
      },
    },

    plugins: [
      // Router
      'expo-router',

      // WebBrowser (safe)
      'expo-web-browser',

      // Location modules (ensures config plugin runs during prebuild)
      'expo-location',
      'expo-task-manager',

      // Mapbox
      '@rnmapbox/maps',

      [
        '@kingstinct/react-native-healthkit',
        {
          NSHealthShareUsageDescription: IOS_HEALTH_SHARE_USAGE_DESCRIPTION,
          NSHealthUpdateUsageDescription: IOS_HEALTH_UPDATE_USAGE_DESCRIPTION,
          background: false,
        },
      ],

      // Build properties (keep Mapbox maven + your SDK targets)
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            kotlinVersion: '2.1.20',
            extraMavenRepos: [
              'https://api.mapbox.com/downloads/v2/releases/maven',
              'https://www.jitpack.io',
              '../node_modules/react-native/android',
            ],
          },
        },
      ],
    ],

    extra: {
      ...(config.extra ?? {}),

      EXPO_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,

      ANDROID_MAPS_API_KEY: process.env.ANDROID_MAPS_API_KEY,

      MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
      MAPBOX_DOWNLOAD_TOKEN: process.env.MAPBOX_DOWNLOAD_TOKEN,

      eas: {
        projectId: '857ce362-d79d-4af3-9f5b-f76bb3195877',
      },
    },

    runtimeVersion: {
      policy: 'sdkVersion',
    },
  };
};
