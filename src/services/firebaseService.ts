/**
 * Firebase service compatibility boundary.
 *
 * Current screens and FinanceContext can keep importing from this file while
 * Firebase internals move into focused modules under src/services/firebase.
 *
 * Do not add new Firebase SDK logic here. Add new Firebase code inside
 * src/services/firebase/* and re-export only when backward compatibility needs it.
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
} from './firebase';
