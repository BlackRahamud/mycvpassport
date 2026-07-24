// Shared CTA behaviour for the launch-offer surfaces (strip, modal, hero).
// Signed-out → remember the builder as the post-auth destination, then send
// to sign up. Signed-in → straight into a fresh builder with upload enabled.
// useCvpAuth reads sessionStorage["cvp_return_path"] after login.

const RETURN_PATH_KEY = 'cvp_return_path';
const BUILDER_DEST = '/builder?new=1';

/**
 * @param {(to: string) => void} navigate react-router navigate
 * @param {object|null} user current auth user (null when signed out)
 */
export function launchCtaNavigate(navigate, user) {
  if (user) {
    navigate(BUILDER_DEST);
    return;
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(RETURN_PATH_KEY, BUILDER_DEST);
    }
  } catch (e) { /* private mode — non-fatal */ }
  // /register renders AuthPage in signup mode.
  navigate('/register');
}
