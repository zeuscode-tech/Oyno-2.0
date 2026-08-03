import { Platform } from 'react-native';
import { analyticsApi } from '@/services/api';

export function trackEvent(
  eventName: string,
  properties: Record<string, string | number | boolean> = {},
): void {
  analyticsApi.track({
    event_name: eventName,
    properties,
    platform: Platform.OS,
    app_version: '1.0.0',
  }).catch(() => {
    // Analytics must never block the user flow.
  });
}
