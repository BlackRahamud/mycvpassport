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
  heading: {
    color: '#4ade80',
    fontSize: 24,
    fontWeight: 700,
    textAlign: 'center',
    margin: '0 0 12px',
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    maxWidth: 380,
    lineHeight: 1.4,
  },
  sub: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
  },
};

const KEYFRAMES = `
@property --ats-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
@keyframes ats-spin-border { to { --ats-angle: 360deg; } }
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
        <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 32, filter: 'drop-shadow(0 0 16px rgba(74,222,128,0.4))' }}>
          <div aria-hidden style={{
            position: 'absolute', inset: 0, borderRadius: '50%', padding: 2,
            background: 'conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(74,222,128,0.8) 80%, transparent 100%)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
            animation: 'ats-spin-border 3s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 2, borderRadius: '50%',
            background: '#0A0A0A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <p style={S.heading}>Pro unlocked</p>
        <p style={S.sub}>Payment confirmed. Your {label} is now unlocked.</p>
        <p style={{ ...S.sub, marginTop: 4 }}>Taking you back to your CV…</p>
        <div style={{ position: 'relative', borderRadius: 12, marginTop: 24 }}>
          <div aria-hidden style={{
            position: 'absolute', inset: 0, borderRadius: 12, padding: 1.5,
            background: 'conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(255,255,255,0.6) 80%, transparent 100%)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
            animation: 'ats-spin-border 2s linear infinite',
          }} />
          <button
            type="button"
            onClick={() => navigate('/builder', { replace: true })}
            style={{
              position: 'relative', background: '#0A0A0A', color: '#fff',
              border: 'none', borderRadius: 12, padding: '14px 32px',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans','Segoe UI',sans-serif",
            }}
          >
            Go to dashboard →
          </button>
        </div>
      </div>
    </>
  );
}
