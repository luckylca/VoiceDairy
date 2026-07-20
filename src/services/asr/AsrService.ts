import { PermissionsAndroid, Platform } from 'react-native';
import {
  SherpaAsr,
  subscribeAsrAmplitude as subscribeNativeAsrAmplitude,
  type AsrAmplitudeEvent,
  type AsrInitOptions,
  type AsrResult,
} from './NativeSherpaAsr';

export type { AsrAmplitudeEvent };

export type AsrActivity = 'idle' | 'initializing' | 'recording' | 'recognizing';

type ActivityListener = (activity: AsrActivity) => void;
type AmplitudeListener = (event: AsrAmplitudeEvent) => void;
type AmplitudeListenerEntry = {
  listener: AmplitudeListener;
  registeredAt: number;
};

const activityListeners = new Set<ActivityListener>();
const amplitudeListeners = new Set<AmplitudeListenerEntry>();
let nativeAmplitudeUnsubscribe: (() => void) | null = null;
let currentActivity: AsrActivity = 'idle';
let recordingStartedAt = 0;
let initialized = false;
let initPromise: Promise<void> | null = null;
let initializedOptionsKey = '';

function setActivity(activity: AsrActivity) {
  if (currentActivity === activity) return;
  currentActivity = activity;
  activityListeners.forEach(listener => listener(activity));
}

function ensureNativeAmplitudeSubscription() {
  if (nativeAmplitudeUnsubscribe) return;
  nativeAmplitudeUnsubscribe = subscribeNativeAsrAmplitude(event => {
    // Only listeners mounted for the current recording receive PCM updates.
    // AgentScreen used to keep a permanent hidden listener that created a new
    // NativeAnimated spring for every quick-record amplitude event. Filtering
    // by registration time prevents hidden tabs from doing background work.
    amplitudeListeners.forEach(entry => {
      if (recordingStartedAt > 0 && entry.registeredAt >= recordingStartedAt - 80) {
        entry.listener(event);
      }
    });
  });
}

export function subscribeAsrAmplitude(listener: AmplitudeListener): () => void {
  const entry: AmplitudeListenerEntry = {
    listener,
    registeredAt: Date.now(),
  };
  amplitudeListeners.add(entry);
  ensureNativeAmplitudeSubscription();

  return () => {
    amplitudeListeners.delete(entry);
    if (amplitudeListeners.size === 0 && nativeAmplitudeUnsubscribe) {
      nativeAmplitudeUnsubscribe();
      nativeAmplitudeUnsubscribe = null;
    }
  };
}

export function getAsrActivity(): AsrActivity {
  return currentActivity;
}

export function subscribeAsrActivity(listener: ActivityListener): () => void {
  activityListeners.add(listener);
  listener(currentActivity);
  return () => activityListeners.delete(listener);
}

export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const alreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (alreadyGranted) return true;

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: '需要麦克风权限',
    message: 'VoiceDiary 需要使用麦克风在本地录音，然后进行端侧语音识别。',
    buttonPositive: '允许',
    buttonNegative: '拒绝',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function optionsKey(options: AsrInitOptions): string {
  return JSON.stringify({
    modelPath: options.modelPath ?? '',
    tokensPath: options.tokensPath ?? '',
    numThreads: options.numThreads,
    language: options.language,
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function initAsr(options: AsrInitOptions): Promise<void> {
  const key = optionsKey(options);
  if (initialized && initializedOptionsKey === key) {
    return Promise.resolve();
  }
  if (initPromise) return initPromise;

  setActivity('initializing');
  initPromise = withTimeout(
    SherpaAsr.init(options),
    30_000,
    '本地语音识别模型初始化超时，请重新进入页面或重启应用。',
  )
    .then(() => {
      initialized = true;
      initializedOptionsKey = key;
    })
    .catch(error => {
      initialized = false;
      initializedOptionsKey = '';
      throw error;
    })
    .finally(() => {
      initPromise = null;
      if (currentActivity === 'initializing') setActivity('idle');
    });

  return initPromise;
}

export async function prewarmAsr(options: AsrInitOptions): Promise<void> {
  try {
    await initAsr(options);
  } catch {
    // Prewarming must never block app startup. A visible retry happens when the
    // user explicitly starts recording.
  }
}

export async function startVoiceRecord(): Promise<void> {
  const granted = await requestMicrophonePermission();
  if (!granted) {
    throw new Error('未获得麦克风权限，无法录音');
  }

  try {
    recordingStartedAt = Date.now();
    await SherpaAsr.startRecord();
    setActivity('recording');
  } catch (error) {
    recordingStartedAt = 0;
    setActivity('idle');
    throw error;
  }
}

export async function stopVoiceRecord(): Promise<AsrResult> {
  setActivity('recognizing');
  try {
    return await SherpaAsr.stopRecord();
  } finally {
    recordingStartedAt = 0;
    setActivity('idle');
  }
}