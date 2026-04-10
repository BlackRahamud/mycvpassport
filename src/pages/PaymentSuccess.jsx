import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const PLAN_CONFIG = {
  coverLetter: {
    label: 'Cover Letter',
    is_pro: false,
    plan: 'coverLetter',
  },
  expressPass: {
    label: 'Express Pass',
    is_pro: true,
    plan: 'expressPass',
  },
  activeHunter: {
    label: 'Active Hunter',
    is_pro: true,
    plan: 'activeHunter',
  },
  careerPro: {
    label: 'Career Pro',
    is_pro: true,
    plan: 'careerPro',
  },
};

const S = {
  wrapper: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0A0A0A',
    zIndex: 9999,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)',
    animation: 'pulseGlow 2.4s ease-in-out infinite',
    pointerEvents: 'none',
  },
  checkCircle: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: '50%',
    background: 'rgba(245,158,11,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  heading: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 600,
    textAlign: 'center',
    margin: '0 0 12px',
    fontFamily: "'Outfit','Segoe UI',sans-serif",
    maxWidth: 380,
    lineHeight: 1.4,
  },
  sub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: "'Outfit','Segoe UI',sans-serif",
  },
};

const KEYFRAMES = `
@keyframes pulseGlow {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%      { transform: scale(1.15); opacity: 1; }
}
`;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [label, setLabel] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function activate() {
      const planKey = searchParams.get('plan');
      const config = planKey ? PLAN_CONFIG[planKey] : null;
      if (!config) { navigate('/', { replace: true }); return; }

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) { navigate('/', { replace: true }); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('features')
        .eq('id', user.id)
        .single();

      const existingFeatures = (profile && profile.features) || {};

      await supabase
        .from('profiles')
        .update({
          is_pro: config.is_pro,
          plan: config.plan,
          features: { ...existingFeatures, [planKey]: true },
        })
        .eq('id', user.id);

      if (!cancelled) {
        setLabel(config.label);
        setTimeout(() => { if (!cancelled) navigate('/builder', { replace: true }); }, 3000);
      }
    }

    activate();
    return () => { cancelled = true; };
  }, [navigate, searchParams]);

  if (!label) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={S.wrapper}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={S.glow} />
          <div style={S.checkCircle}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <p style={S.heading}>Payment confirmed. Your {label} is now unlocked.</p>
        <p style={S.sub}>Taking you back to your CV…</p>
      </div>
    </>
  );
}
