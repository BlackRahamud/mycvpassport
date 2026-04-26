// Synchronous user-id cache for analytics call sites that can't await
// supabase.auth.getSession(). Written by useCvpAuth.applySession on
// every session transition; read by logEvent() to attach candidate_id
// to the Supabase write without going async.

let _currentAuthUserId = null;

export function setCurrentAuthUserId(id) {
  _currentAuthUserId = id || null;
}

export function currentAuthUserId() {
  return _currentAuthUserId;
}
