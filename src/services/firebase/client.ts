import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import {
  runtimeConfig,
} from '../environment';

export const firebaseConfig = {
  apiKey:
    runtimeConfig
      .firebase
      .apiKey,
  authDomain:
    runtimeConfig
      .firebase
      .authDomain,
  projectId:
    runtimeConfig
      .firebase
      .projectId,
  storageBucket:
    runtimeConfig
      .firebase
      .storageBucket,
  messagingSenderId:
    runtimeConfig
      .firebase
      .messagingSenderId,
  appId:
    runtimeConfig
      .firebase
      .appId,
};

export const firebaseConfigured =
  runtimeConfig
    .firebaseConfigured;

export const app: FirebaseApp | null = firebaseConfigured
  ? getApps()[0] || initializeApp(firebaseConfig)
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;

export const db: Firestore | null = app ? getFirestore(app) : null;
