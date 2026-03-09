declare module 'react-native-health-connect' {
  export type Permission = {
    accessType: string;
    recordType: string;
  };

  export type GrantedPermission =
    | string
    | {
        accessType?: string;
        recordType?: string;
      };

  export type HeartRateSample = {
    time?: string | Date;
    beatsPerMinute?: number;
  };

  export type HeartRateRecord = {
    startTime?: string | Date;
    endTime?: string | Date;
    samples?: HeartRateSample[];
    metadata?: {
      id?: string;
      dataOrigin?: string;
      device?: {
        manufacturer?: string;
        model?: string;
        type?: string;
      } | null;
    } | null;
  };

  export function getSdkStatus(providerPackageName?: string): Promise<string | number>;
  export function initialize(): Promise<void>;
  export function getGrantedPermissions(): Promise<GrantedPermission[]>;
  export function requestPermission(permissions: Permission[]): Promise<GrantedPermission[]>;
  export function readRecords(
    recordType: 'HeartRate',
    options: {
      timeRangeFilter: {
        operator: 'between';
        startTime: string | Date;
        endTime: string | Date;
      };
      pageSize?: number;
      ascendingOrder?: boolean;
    }
  ): Promise<{ records?: HeartRateRecord[] }>;
  export function openHealthConnectSettings(): Promise<void>;
}
