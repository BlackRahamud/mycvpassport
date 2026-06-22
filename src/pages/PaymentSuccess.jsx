import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import PostPaymentOverlay from '../invoices/PostPaymentOverlay';

// Cosmetic-only post-payment landing for Ziina (AE) buyers. The webhook is
// the SOLE source of access — this page does NOT write to profiles, ever.
// It validates the URL belongs to a logged-in buyer for a known plan, then
// shows PostPaymentOverlay which polls invoices until the webhook chain
// has confirmed activation.

const PLAN_LABELS = {
  coverLetter: 'Cover Letter',
  expressPass: 'Express Pass',
  activeHunter: 'Active Hunter',
  careerPro: 'Career Pro',
};

export default function PaymentSuccess({ refreshProfile }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verified, setVerified] = useState(false);

  // Ziina sends ?feature=<key>&uid=<id>; older links may still carry ?plan=
  // — accept both so legacy queued links don't bounce buyers to "/".
  const planKey = searchParams.get('feature') || searchParams.get('plan');
  const label = planKey ? PLAN_LABELS[planKey] : null;

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!planKey || !label) {
        navigate('/', { replace: true });
        return;
      }
      const { data: { user } = {}, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !user) {
        navigate('/', { replace: true });
        return;
      }
      setVerified(true);
    }
    verify();
    return () => { cancelled = true; };
  }, [planKey, label, navigate]);

  const handleActivated = () => {
    // Sync useCvpAuth's app-level profile state so any subsequent route
    // (Dashboard, Builder) reads fresh isPro / pro_access_expires_at.
    if (refreshProfile) refreshProfile();
  };

  if (!verified) return null;

  return (
    <PostPaymentOverlay
      gateway="ziina"
      planLabel={label}
      onActivated={handleActivated}
      onGoToDashboard={() => navigate('/dashboard', { replace: true })}
      onBuildCv={() => navigate('/builder', { replace: true })}
    />
  );
}
