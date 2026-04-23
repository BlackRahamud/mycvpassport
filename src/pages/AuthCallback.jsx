// Dedicated destination for OAuth redirects. The Supabase client (configured
// with detectSessionInUrl + flowType:"pkce") exchanges the ?code= param for a
// session automatically; useCvpAuth's post-auth useEffect then routes the user
// to /dashboard or the stashed postAuthRedirect. This component only needs to
// render a quiet placeholder while that happens — no logic lives here.

export default function AuthCallback() {
  return (
    <>
      <style>{`
        @property --cvp-cb-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes cvp-cb-spin { to { --cvp-cb-angle: 360deg; } }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          inset: 0,
          background: "#0A0A0A",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <div style={{ position: "relative", width: 96, height: 96, filter: "drop-shadow(0 0 18px rgba(255,255,255,0.18))" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              padding: 2,
              background: "conic-gradient(from var(--cvp-cb-angle, 0deg), transparent 55%, rgba(255,255,255,0.75) 82%, transparent 100%)",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
              animation: "cvp-cb-spin 1.4s linear infinite",
              willChange: "transform",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 10,
              borderRadius: "50%",
              background: "#0A0A0A",
              border: "1px solid #2A2A2A",
            }}
          />
        </div>
        <div
          style={{
            color: "#A0A0A0",
            fontFamily: "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace",
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Signing you in…
        </div>
      </div>
    </>
  );
}
