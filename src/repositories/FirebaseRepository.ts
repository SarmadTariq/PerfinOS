/**
 * Firebase Repository compatibility boundary.
 *
 * Repository consumers import authentication capabilities from here while the
 * SDK implementation lives under src/services/firebase.
 *
 * Finance persistence is owned by focused repositories under
 * src/services/firebase and is intentionally not re-exported here.
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
} from '../services/firebase';
