import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDownloadGatekeeperData, getCvpPricingCurrencyCode } from "../components/FAB/FABLogic";
import { supabase } from "../supabaseClient";
import "../components/FAB/FAB.css";

function normTier(raw) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function planLadderKind({ isPaidUser, planTier, isPro, planName }) {
  if (!isPaidUser) return "explorer";
  const t = normTier(planTier);
  if (isPro || t === "career_pro" || t === "pro" || t === "max_pro") return "career_pro";
  if (t === "express_pass" || t === "active_hunter") return "express_pass";
  if (planName === "Career Pro") return "career_pro";
  if (planName === "Express Pass" || planName === "Active Hunter") return "express_pass";
  return "explorer";
}

function badgePlanTitle(gate, kind) {
  if (!gate) return "";
  if (!gate.isPaidUser) return "Explorer";
  if (kind === "career_pro") return "Career Pro";
  if (kind === "express_pass") return gate.planName === "Active Hunter" ? "Active Hunter" : "Express Pass";
  return gate.planName || "Explorer";
}

const nextStepShell = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "#1C1C1C",
  border: "1px solid #2A2A2A",
  boxSizing: "border-box",
  display: "grid",
  placeItems: "center",
  zIndex: 1,
};

/**
 * Plan progress ladder: Explorer → Express Pass → Career Pro.
 * Step state driven by current plan from Supabase auth/profile.
 * Upgrade CTAs below ladder. No upgrade buttons on Career Pro.
 */
export default function AccountPage() {
  const navigate = useNavigate();
  const [gate, setGate] = useState(null);
  const [planTier, setPlanTier] = useState(null);
  const [profileIsPro, setProfileIsPro] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const g = await getDownloadGatekeeperData();
      if (cancel) return;
      setGate(g);
      if (!supabase || !g.isSignedIn) {
        setPlanTier(null);
        setProfileIsPro(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setPlanTier(null);
        setProfileIsPro(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("is_pro, plan_tier, plan").eq("id", user.id).maybeSingle();
      if (cancel) return;
      setProfileIsPro(!!data?.is_pro);
      setPlanTier(data?.plan_tier ?? data?.plan ?? null);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const currency = getCvpPricingCurrencyCode();
  const subs = useMemo(
    () => ({
      s1: "free",
      s2: currency === "IN" ? "₹399" : "AED 49",
      s3: currency === "IN" ? "₹599/yr" : "AED 199/yr",
    }),
    [currency],
  );

  const kind = useMemo(() => {
    if (!gate) return "explorer";
    return planLadderKind({
      isPaidUser: gate.isPaidUser,
      planTier,
      isPro: profileIsPro,
      planName: gate.planName,
    });
  }, [gate, planTier, profileIsPro]);

  const stepStates = useMemo(() => {
    if (kind === "career_pro") return ["done", "done", "done"];
    if (kind === "express_pass") return ["done", "done", "active"];
    return ["done", "active", "next"];
  }, [kind]);

  const steps = useMemo(
    () => [
      { key: "e", title: "Explorer", sub: subs.s1 },
      { key: "x", title: "Express Pass", sub: subs.s2 },
      { key: "c", title: "Career Pro", sub: subs.s3 },
    ],
    [subs],
  );

  const title = badgePlanTitle(gate, kind);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page, #0A0A0A)",
        color: "var(--text-primary, #FFFFFF)",
        fontFamily: "'DM Sans',sans-serif",
        padding: "16px 16px 96px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .cvp-account-plan-shell .cvp-ats-sheet-cta-btn {
          position: relative;
          overflow: hidden;
          background: #1c1c1c;
          border: 1px solid #2a2a2a;
          border-radius: 11px;
          padding: 13px 16px;
          color: #fff;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          cursor: pointer;
          box-sizing: border-box;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            transform 0.1s ease !important;
        }
        .cvp-account-plan-shell .cvp-ats-sheet-cta-btn::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(55, 138, 221, 0.08), transparent);
          animation: cvpAtsShimmer 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
        }
        .cvp-account-plan-shell .cvp-ats-sheet-cta-btn--shimmer-delay::after {
          animation-delay: 0.4s;
        }
        .cvp-account-plan-shell .cvp-ats-sheet-cta-btn > span:first-child {
          position: relative;
          z-index: 1;
          text-align: left;
        }
        .cvp-account-plan-shell .cvp-ats-sheet-cta-arrow {
          position: relative;
          z-index: 1;
          color: #a0a0a0;
          transition: color 0.15s ease, transform 0.2s ease !important;
        }
        .cvp-account-plan-shell .cvp-ats-sheet-cta-btn:hover {
          background: #242424 !important;
          border-color: #378add !important;
        }
        .cvp-account-plan-shell .cvp-ats-sheet-cta-btn:hover .cvp-ats-sheet-cta-arrow {
          color: #378add !important;
          transform: translateX(3px) !important;
        }
        .cvp-account-plan-shell .cvp-ats-sheet-cta-btn:active {
          transform: scale(0.98) !important;
        }
      `}</style>

      <button
        type="button"
        onClick={() => navigate("/dashboard", { replace: true, state: { fabGuideTab: "account" } })}
        aria-label="Back"
        style={{
          width: 36,
          height: 36,
          padding: 0,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "#A0A0A0",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 8, marginBottom: 4, textAlign: "center" }}>Your plan</h1>

      {gate == null ? (
        <p style={{ margin: "24px 0 0", fontSize: 13, color: "#A0A0A0", textAlign: "center" }}>Loading plan…</p>
      ) : (
        <>
          <div style={{ textAlign: "center", marginTop: 8, marginBottom: 8 }}>
            <span
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: 99,
                background: gate.isPaidUser ? "#0F6E56" : "#1C1C1C",
                color: gate.isPaidUser ? "#9FE1CB" : "#A0A0A0",
                fontSize: 12,
                fontWeight: 600,
                border: gate.isPaidUser ? "none" : "1px solid #2A2A2A",
              }}
            >
              {title}
            </span>
          </div>

          <div style={{ position: "relative", marginTop: 18, width: "100%" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 15,
                height: 1,
                background: "#2A2A2A",
                zIndex: 0,
              }}
            />
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 8, position: "relative", zIndex: 1 }}>
              {steps.map((step, i) => {
                const st = stepStates[i];
                return (
                  <div
                    key={step.key}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0 }}
                  >
                    {st === "done" ? (
                      <>
                        <div
                          className="cvp-ats-step-pop"
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: "#378ADD",
                            display: "grid",
                            placeItems: "center",
                            zIndex: 1,
                          }}
                        >
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 9, fontWeight: 500, color: "#378ADD" }}>{step.title}</div>
                        <div style={{ marginTop: 2, fontSize: 9, color: "#A0A0A0" }}>{step.sub}</div>
                      </>
                    ) : null}
                    {st === "active" ? (
                      <>
                        <div
                          style={{
                            ...nextStepShell,
                            border: "1.5px solid #378ADD",
                          }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#378ADD" }} />
                        </div>
                        <div style={{ marginTop: 8, fontSize: 9, fontWeight: 500, color: "#378ADD" }}>{step.title}</div>
                        <div style={{ marginTop: 2, fontSize: 9, color: "#A0A0A0" }}>{step.sub}</div>
                      </>
                    ) : null}
                    {st === "next" ? (
                      <>
                        <div style={nextStepShell}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2A2A2A" }} />
                        </div>
                        <div style={{ marginTop: 8, fontSize: 9, fontWeight: 500, color: "#A0A0A0" }}>{step.title}</div>
                        <div style={{ marginTop: 2, fontSize: 9, color: "#A0A0A0" }}>{step.sub}</div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {kind === "career_pro" ? (
            <p style={{ margin: "20px 0 0", fontSize: 13, color: "#A0A0A0", textAlign: "center", lineHeight: 1.45 }}>
              You&apos;re on the best plan.
            </p>
          ) : (
            <>
              <div className="cvp-account-plan-shell" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20, width: "100%" }}>
                {kind === "explorer" ? (
                  <button type="button" className="cvp-ats-sheet-cta-btn" onClick={() => navigate("/pricing")}>
                    <span>Upgrade to Express Pass</span>
                    <span className="cvp-ats-sheet-cta-arrow" aria-hidden>
                      →
                    </span>
                  </button>
                ) : (
                  <button type="button" className="cvp-ats-sheet-cta-btn" onClick={() => navigate("/pricing")}>
                    <span>Upgrade to Career Pro</span>
                    <span className="cvp-ats-sheet-cta-arrow" aria-hidden>
                      →
                    </span>
                  </button>
                )}
                <button type="button" className="cvp-ats-sheet-cta-btn cvp-ats-sheet-cta-btn--shimmer-delay" onClick={() => navigate("/pricing")}>
                  <span>See all plans</span>
                  <span className="cvp-ats-sheet-cta-arrow" aria-hidden>
                    →
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate("/dashboard", { state: { fabGuideTab: "account" } })}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: 12,
                  border: "none",
                  background: "transparent",
                  color: "#505050",
                  fontSize: 12,
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#A0A0A0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#505050";
                }}
              >
                Stay on current plan
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
