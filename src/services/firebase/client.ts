import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
  type Persistence,
} from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const env = process.env || {};

export const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const app: FirebaseApp | null = firebaseConfigured
  ? getApps()[0] || initializeApp(firebaseConfig)
  : null;

export const authPersistenceMode = 'react-native-async-storage';

type ReactNativeAuthBundle = typeof firebaseAuth & {
  getReactNativePersistence?: (
    storage: typeof AsyncStorage
  ) => Persistence;
};

const getAsyncStoragePersistence = () =>
  (firebaseAuth as ReactNativeAuthBundle)
    .getReactNativePersistence?.(
      AsyncStorage
    ) || null;

const createAuth = (firebaseApp: FirebaseApp): Auth => {
  const persistence =
    getAsyncStoragePersistence();

  try {
    return persistence
      ? initializeAuth(firebaseApp, {
          persistence,
        })
      : getAuth(firebaseApp);
  } catch {
    return getAuth(firebaseApp);
  }
};

export const auth: Auth | null = app ? createAuth(app) : null;

export const db: Firestore | null = app ? getFirestore(app) : null;
