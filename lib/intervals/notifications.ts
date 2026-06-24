import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

import { getIntervalRuntimeState } from '@/lib/intervals/plans';
import type { IntervalPlan, IntervalPlanStep } from '@/lib/intervals/types';

type NotificationsModule = typeof import('expo-notifications');

const INTERVAL_CHANNEL_ID = 'interval-cues';
const REQUIRED_NOTIFICATION_MODULES = [
  'ExpoPushTokenManager',
  'ExpoNotificationScheduler',
  'ExpoNotificationsEmitter',
  'ExpoNotificationsHandlerModule',
  'ExpoNotificationPermissionsModule',
  'ExpoNotificationPresenter',
  'ExpoNotificationChannelManager',
] as const;

let cachedNotificationsModule: NotificationsModule | null | undefined;
let notificationHandlerConfigured = false;
let missingModuleWarningShown = false;
let runtimeRequire: ((moduleName: string) => unknown) | null | undefined;

function hasRequiredNotificationNativeModules() {
  return REQUIRED_NOTIFICATION_MODULES.every(
    (moduleName) => requireOptionalNativeModule(moduleName) !== null
  );
}

function getRuntimeRequire() {
  if (runtimeRequire !== undefined) {
    return runtimeRequire;
  }

  try {
    const nextRequire = (0, eval)('require') as ((moduleName: string) => unknown) | undefined;
    runtimeRequire = typeof nextRequire === 'function' ? nextRequire : null;
  } catch {
    runtimeRequire = null;
  }

  return runtimeRequire;
}

function getNotificationsModule(): NotificationsModule | null {
  if (cachedNotificationsModule !== undefined) {
    return cachedNotificationsModule;
  }

  if (!hasRequiredNotificationNativeModules()) {
    cachedNotificationsModule = null;

    if (__DEV__ && !missingModuleWarningShown) {
      missingModuleWarningShown = true;
      console.warn(
        '[IntervalNotifications] Native notification modules are unavailable in this build. Rebuild the app to enable interval cues.'
      );
    }

    return cachedNotificationsModule;
  }

  try {
    // Delay the native module access so the app still runs in clients that were
    // not rebuilt after adding expo-notifications.
    const nextRequire = getRuntimeRequire();
    if (!nextRequire) {
      cachedNotificationsModule = null;
      return cachedNotificationsModule;
    }

    cachedNotificationsModule = nextRequire('expo-notifications') as NotificationsModule;
  } catch (error) {
    cachedNotificationsModule = null;

    if (__DEV__ && !missingModuleWarningShown) {
      missingModuleWarningShown = true;
      console.warn(
        '[IntervalNotifications] expo-notifications native module unavailable. Rebuild the app to enable interval cues.',
        error
      );
    }
  }

  return cachedNotificationsModule;
}

function ensureNotificationHandlerConfigured(notifications: NotificationsModule) {
  if (notificationHandlerConfigured) {
    return;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationHandlerConfigured = true;
}

function buildCueTitle(step: IntervalPlanStep) {
  switch (step.kind) {
    case 'warmup':
      return 'Warm-up';
    case 'work':
      return step.intervalIndex ? `Work ${step.intervalIndex}` : 'Work';
    case 'recovery':
      return step.intervalIndex ? `Break ${step.intervalIndex}` : 'Break';
    case 'rest':
      return step.intervalIndex ? `Rest ${step.intervalIndex}` : 'Rest';
    case 'cooldown':
      return 'Cooldown';
    default:
      return step.label;
  }
}

function buildCueBody(step: IntervalPlanStep) {
  return step.cue || `Move into ${step.label.toLowerCase()}.`;
}

export function areIntervalNotificationsAvailable() {
  return getNotificationsModule() !== null;
}

export async function ensureIntervalNotificationsReady() {
  const notifications = getNotificationsModule();
  if (!notifications) {
    return false;
  }

  ensureNotificationHandlerConfigured(notifications);

  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync(INTERVAL_CHANNEL_ID, {
      name: 'Interval Cues',
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 140, 180],
      sound: 'default',
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const existing = await notifications.getPermissionsAsync();
  if (
    existing.granted ||
    existing.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const requested = await notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  return (
    requested.granted ||
    requested.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function cancelIntervalCueNotifications(notificationIds: string[]) {
  const notifications = getNotificationsModule();
  if (!notifications || notificationIds.length === 0) {
    return;
  }

  await Promise.all(
    notificationIds.map((notificationId) =>
      notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined)
    )
  );
}

export async function scheduleIntervalCueNotifications(
  plan: IntervalPlan,
  elapsedSeconds: number
) {
  const notifications = getNotificationsModule();
  if (!notifications) {
    return [] as string[];
  }

  ensureNotificationHandlerConfigured(notifications);

  const runtime = getIntervalRuntimeState(plan, elapsedSeconds);
  if (runtime.isComplete || !runtime.currentStep) {
    return [] as string[];
  }

  const scheduledIds: string[] = [];
  let delaySeconds = Math.max(1, runtime.stepRemainingSeconds);

  for (let nextIndex = runtime.currentStepIndex + 1; nextIndex < plan.steps.length; nextIndex += 1) {
    const step = plan.steps[nextIndex];
    const notificationId = await notifications.scheduleNotificationAsync({
      content: {
        title: buildCueTitle(step),
        body: buildCueBody(step),
        sound: 'default',
        data: {
          kind: 'interval_phase',
          planId: plan.id,
          stepIndex: nextIndex,
          phaseKind: step.kind,
        },
      },
      trigger: Platform.select({
        android: {
          type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
          channelId: INTERVAL_CHANNEL_ID,
        },
        default: {
          type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
        },
      }),
    });

    scheduledIds.push(notificationId);
    delaySeconds += step.durationSeconds;
  }

  const completionId = await notifications.scheduleNotificationAsync({
    content: {
      title: `${plan.name} complete`,
      body: 'Your interval block is done. Save the session when you are ready.',
      sound: 'default',
      data: {
        kind: 'interval_complete',
        planId: plan.id,
      },
    },
    trigger: Platform.select({
      android: {
        type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, getIntervalRuntimeState(plan, elapsedSeconds).totalRemainingSeconds),
        channelId: INTERVAL_CHANNEL_ID,
      },
      default: {
        type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, getIntervalRuntimeState(plan, elapsedSeconds).totalRemainingSeconds),
      },
    }),
  });

  scheduledIds.push(completionId);
  return scheduledIds;
}
