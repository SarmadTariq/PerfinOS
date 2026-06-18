import { initializeApp, getApps } from 'firebase/app';
import {Auth, User as FirebaseUser, createUserWithEmailAndPassword, getAuth, onAuthStateChanged,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {Firestore, doc, getDoc, getFirestore, onSnapshot, setDoc} from 'firebase/firestore';
import { AppData } from '../models/finance';
import { createEmptyAppData } from './initialData';

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

const app = firebaseConfigured ? getApps()[0] || initializeApp(firebaseConfig) : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;

const dataRef = (userId: string) => {
  if (!db) throw new Error('Firestore is not configured');
  return doc(db, 'users', userId, 'private', 'appData');
};

const normalizeRemoteData = (userId: string, data: AppData): AppData => ({
  ...data,
  user: { ...data.user, id: userId },
  entitlement: data.entitlement || createEmptyAppData({ userId, isGuest: false }).entitlement,
  transactions: data.transactions.map((transaction) => ({
    ...transaction,
    userId,
    receipts: transaction.receipts || [],
    location: {
      ...transaction.location,
      name: transaction.location.name || transaction.merchant,
      formattedAddress: transaction.location.formattedAddress || transaction.location.address,
      source: transaction.location.source || 'imported',
    },
  })),
  budgets: data.budgets.map((budget) => ({ ...budget, userId })),
  savingsGoals: data.savingsGoals.map((goal) => ({ ...goal, userId })),
  recurringExpenses: data.recurringExpenses.map((expense) => ({ ...expense, userId })),
  reports: data.reports.map((report) => ({ ...report, userId })),
  onboarded: !!data.onboarded,
});

const firestoreSafeData = (data: AppData): AppData => JSON.parse(JSON.stringify(data)) as AppData;

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, callback);
};

export const signInRemote = async (email: string, password: string) => {
  if (!auth) throw new Error('Firebase Auth is not configured');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const signUpRemote = async (email: string, password: string) => {
  if (!auth) throw new Error('Firebase Auth is not configured');
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const sendRemotePasswordReset = async (email: string) => {
  if (!auth) throw new Error('Firebase Auth is not configured');
  await sendPasswordResetEmail(auth, email);
};

export const logoutRemote = async () => {
  if (auth?.currentUser) await signOut(auth);
};

export const ensureRemoteAppData = async (userId: string, fallback?: AppData) => {
  const ref = dataRef(userId);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return normalizeRemoteData(userId, snapshot.data() as AppData);
  const empty = normalizeRemoteData(userId, fallback || createEmptyAppData({ userId, isGuest: false }));
  await setDoc(ref, firestoreSafeData(empty));
  return empty;
};

export const saveRemoteAppData = async (userId: string, data: AppData) => {
  await setDoc(dataRef(userId), firestoreSafeData(normalizeRemoteData(userId, data)));
};

export const subscribeRemoteAppData = (
  userId: string,
  onData: (data: AppData) => void,
  onError: (error: Error) => void
) =>
  onSnapshot(
    dataRef(userId),
    (snapshot) => {
      if (snapshot.exists()) onData(normalizeRemoteData(userId, snapshot.data() as AppData));
    },
    (error) => onError(error)
  );
