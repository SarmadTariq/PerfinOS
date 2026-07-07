export {
  app,
  auth,
  db,
  firebaseConfig,
  firebaseConfigured,
} from './client';

export {
  logoutRemote,
  sendRemotePasswordReset,
  signInRemote,
  signUpRemote,
  subscribeToAuth,
} from './auth';

export {
  getLegacyAppDataRef,
  legacyAppDataPath,
} from './paths';

export {
  ensureRemoteAppData,
  saveRemoteAppData,
  subscribeRemoteAppData,
} from './legacyAppDataStore';
