import { Platform } from 'react-native';

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');
const ANDROID_EMULATOR_HOST = '10.0.2.2';

const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    return `http://${ANDROID_EMULATOR_HOST}:8080/api/v1`;
  }

  return 'http://localhost:8080/api/v1';
};

const normalizeApiUrl = (value?: string) => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return getDefaultApiUrl();
  }

  if (Platform.OS === 'android') {
    return trimmedValue.replace('://localhost', `://${ANDROID_EMULATOR_HOST}`);
  }

  return trimmedValue;
};

export const API_BASE_URL = trimTrailingSlashes(
  normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL)
);

export const WS_BASE_URL = API_BASE_URL
  .replace(/^https:/, 'wss:')
  .replace(/^http:/, 'ws:')
  .replace(/\/api\/v1$/, '/ws');
