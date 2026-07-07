/**
 * Firebase Repository compatibility boundary.
 *
 * Repository consumers import Firebase capabilities from here while the SDK
 * implementation lives under src/services/firebase.
 *
 * This file should stay thin. Entity-level repositories should be introduced
 * in later branches without expanding this compatibility layer.
 */

export {
  app,
  auth,
  db,
  firebaseConfig,
  firebaseConfigured,
  logoutRemote,
  sendRemotePasswordReset,
  signInRemote,
  signUpRemote,
  subscribeToAuth,
  getLegacyAppDataRef,
  legacyAppDataPath,
  ensureRemoteAppData,
  saveRemoteAppData,
  subscribeRemoteAppData,
} from '../services/firebase';
