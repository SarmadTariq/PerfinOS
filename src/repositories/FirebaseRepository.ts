/**
 * Firebase Repository — thin re-export layer over the Firebase service.
 *
 * ViewModels import CRUD operations from here rather than from the service directly.
 * This isolates the rest of the app from Firebase SDK details and makes future
 * backend swaps (e.g., Supabase, direct REST) a single-file change.
 *
 * The underlying implementation lives in `src/services/firebaseService.ts`.
 */
export {
  signInRemote,
  signUpRemote,
  logoutRemote,
  sendRemotePasswordReset,
  ensureRemoteAppData,
  saveRemoteAppData,
  subscribeRemoteAppData,
  subscribeToAuth,
  auth,
  db,
  firebaseConfigured,
} from '../services/firebaseService';
