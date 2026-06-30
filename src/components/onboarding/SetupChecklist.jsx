import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { usePermissions } from "@/components/permissions/usePermissions";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from "lucide-react";
import FeatureOverview from "./FeatureOverview";

const G = "#8B9A7E";
const BG = "#0D0D0D";
const BORDER = "rgba(255,255,255,0.08)";
const FG = "#FAFAF8";
const MID = "#9CA3AF";

const STEPS = [
  {
    id: "shop_info",
    title: "Set your shop name & info",
    desc: "Add your shop's name, address, and phone number. This appears on your public booking page so clients know where to find you.",
    link: "/Settings?tab=shop",
    linkLabel: "Go to Shop Info",
    manual: false,
  },
  {
    id: "services",
    title: "Add your services",
    desc: "Add the services you offer, with prices and durations. Clients will choose from these when booking online.",
    link: "/Settings?tab=services",
    linkLabel: "Go to Services",
    manual: false,
  },
  {
    id: "hours",
    title: "Set your shop hours",
    desc: "Set the days and hours your shop is open. These control when clients can book appointments online.",
    link: "/Settings?tab=hours",
    linkLabel: "Go to Shop Hours",
    manual: true,
  },
  {
    id: "barbers",
    title: "Add your barbers",
    desc: "Invite your team. Each barber gets their own login, calendar, and can be assigned services and individual hours.",
    link: "/Settings?tab=barbers",
    linkLabel: "Go to Barbers",
    manual: false,
  },
  {
    id: "url_slug",
    title: "Customize your booking page URL",
    desc: "Your booking page is live at standtallbooking.com/book/[your-slug]. Customize the URL to match your shop name so it's easy to share.",
    link: "/Settings?tab=booking_page",
    linkLabel: "Go to Booking Page",
    manual: false,
  },
  {
    id: "social",
    title: "Add your social media links",
    desc: "Add your Instagram, Facebook, or TikTok. These show up on your booking page to help clients connect with you.",
    link: "/Settings?tab=booking_page",
    linkLabel: "Go to Booking Page",
    manual: true,
  },
  {
    id: "stripe",
    title: "Connect Stripe to accept payments",
    desc: "Connect your Stripe account to collect deposits and process payments through your booking page. You'll need a Stripe account — it's free to sign up.",
    link: "/Settings?tab=payments",
    linkLabel: "Go to Payments",
    manual: false,
  },
  {
    id: "clients",
    title: "Import your existing clients",
    desc: "Already have a client list from Vagaro, Square, or another platform? Import it here so your history comes with you.",
    link: "/ClientList",
    linkLabel: "Go to Clients",
    manual: true,
  },
  {
    id: "share",
    title: "Share your booking link",
    desc: "You're ready to take bookings! Copy your booking link and share it with clients — add it to your Instagram bio, website, or send it directly.",
    link: "/Settings?tab=booking_page",
    linkLabel: "Go to Booking Page",
    manual: true,
  },
];

function computeStepsDone(shopData, shopSettings, servicesCount, barbersCount, meta) {
  const manual = meta?.manual_steps || {};
  // A slug is "customized" when it no longer ends with the auto-generated
  // suffix ("-" + first 8 chars of the shop UUID).
  const defaultSuffix = shopData?.id ? "-" + shopData.id.slice(0, 8) : null;
  const slugCustomized = !!(
    shopData?.url_slug &&
    defaultSuffix &&
    !shopData.url_slug.endsWith(defaultSuffix)
  ) || !!manual.url_slug;

  return {
    shop_info: !!(shopSettings?.shop_name?.trim() && shopSettings?.shop_address?.trim()),
    services:  servicesCount > 0,
    hours:     !!manual.hours,
    barbers:   barbersCount > 1,
    url_slug:  slugCustomized,
    social:    !!manual.social,
    stripe:    !!shopData?.stripe_account_id,
    clients:   !!manual.clients,
    share:     !!manual.share,
  };
}

function Inner({ shopId }) {
  const [shopData,      setShopData]      = useState(null);
  const [shopSettings,  setShopSettings]  = useState(null);
  const [servicesCount, setServicesCount] = useState(0);
  const [barbersCount,  setBarbersCount]  = useState(0);
  const [meta,          setMeta]          = useState({});
  const [loading,       setLoading]       = useState(true);

  const [expanded,     setExpanded]     = useState(null);
  const [minimized,    setMinimized]    = useState(false);
  const [nagDismissed, setNagDismissed] = useState(false);
  const [showOverview, setShowOverview] = useState(false);

  // Prevent the completion-save effect from running more than once
  const completionFired = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [shopRes, settingsRes, svcRes, barberRes] = await Promise.all([
        supabase.from("shops").select("id, url_slug, stripe_account_id, onboarding_meta").eq("id", shopId).single(),
        supabase.from("shop_settings").select("shop_name, shop_address").eq("shop_id", shopId).maybeSingle(),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
        supabase.from("barbers").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
      ]);
      setShopData(shopRes.data);
      setShopSettings(settingsRes.data);
      setServicesCount(svcRes.count ?? 0);
      setBarbersCount(barberRes.count ?? 0);
      setMeta(shopRes.data?.onboarding_meta ?? {});
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveMeta = useCallback(async (patch) => {
    if (!shopData?.id) return;
    const next = { ...meta, ...patch };
    setMeta(next);
    await supabase.from("shops").update({ onboarding_meta: next }).eq("id", shopData.id);
  }, [meta, shopData?.id]);

  const markManualStep = useCallback((stepId) => {
    saveMeta({ manual_steps: { ...(meta.manual_steps ?? {}), [stepId]: true } });
  }, [saveMeta, meta.manual_steps]);

  const markOverviewSeen = useCallback(() => {
    saveMeta({ feature_overview_seen: true });
    setShowOverview(false);
  }, [saveMeta]);

  // Derived state
  const stepsDone    = computeStepsDone(shopData, shopSettings, servicesCount, barbersCount, meta);
  const doneCount    = Object.values(stepsDone).filter(Boolean).length;
  const allDone      = doneCount === STEPS.length;
  const pct          = Math.round((doneCount / STEPS.length) * 100);
  const remaining    = STEPS.length - doneCount;
  const isComplete   = meta.completed === true;

  // When all steps become done for the first time, save completion flag and
  // optionally open the feature overview.
  useEffect(() => {
    if (!loading && allDone && !isComplete && shopData?.id && !completionFired.current) {
      completionFired.current = true;
      const showIt = !meta.feature_overview_seen;
      saveMeta({ completed: true }).then(() => {
        if (showIt) setShowOverview(true);
      });
    }
  }, [loading, allDone, isComplete, shopData?.id, meta.feature_overview_seen, saveMeta]);

  if (loading || isComplete) return null;

  // ── Nag banner (shown when widget is minimized) ───────────────────────────
  if (minimized) {
    return (
      <>
        {!nagDismissed && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 60,
            background: "#0c1f12",
            borderBottom: "1px solid rgba(139,154,126,0.25)",
            padding: "9px 1rem",
            display: "flex", alignItems: "center", gap: "10px",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            <span style={{ fontSize: "14px", flexShrink: 0 }}>⚙️</span>
            <span style={{ fontSize: "13px", color: FG, flex: 1, fontWeight: 500, minWidth: 0 }}>
              Finish setting up your shop —{" "}
              <span style={{ color: G }}>{remaining} step{remaining !== 1 ? "s" : ""} remaining</span>
            </span>
            <button
              onClick={() => setMinimized(false)}
              style={{
                background: G, color: BG, border: "none",
                padding: "5px 14px", fontSize: "12px", fontWeight: 600,
                borderRadius: "2px", cursor: "pointer", flexShrink: 0,
              }}
            >
              Continue →
            </button>
            <button
              onClick={() => setNagDismissed(true)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: MID, padding: "4px", display: "flex", alignItems: "center", flexShrink: 0,
              }}
              aria-label="Dismiss for this session"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {showOverview && <FeatureOverview onClose={markOverviewSeen} />}
      </>
    );
  }

  // ── Main widget ───────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="md:bottom-4"
        style={{
          position: "fixed",
          bottom: "5.5rem",   // clears the mobile bottom nav (4rem + safe area)
          right: "1rem",
          width: "min(320px, calc(100vw - 2rem))",
          background: BG,
          border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: "12px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          zIndex: 55,
          fontFamily: "'Inter', system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "13px 14px 11px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: G, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Shop Setup
              </span>
              <span style={{ fontSize: "11px", color: MID }}>
                {doneCount} / {STEPS.length} · {pct}%
              </span>
            </div>
            <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: G, borderRadius: "2px",
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
          <button
            onClick={() => setMinimized(true)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: MID, padding: "2px", display: "flex", alignItems: "center", flexShrink: 0,
            }}
            aria-label="Minimize setup checklist"
          >
            <X size={14} />
          </button>
        </div>

        {/* Step list */}
        <div style={{ maxHeight: "min(55vh, 420px)", overflowY: "auto" }}>
          {allDone ? (
            // All done — show completion state
            <div style={{ padding: "1.5rem 1rem", textAlign: "center" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: "rgba(139,154,126,0.12)", border: `1px solid ${G}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 0.75rem",
              }}>
                <CheckCircle2 size={22} style={{ color: G }} />
              </div>
              <p style={{ fontSize: "15px", fontWeight: 700, color: FG, margin: "0 0 0.4rem" }}>You're all set! 🎉</p>
              <p style={{ fontSize: "12px", color: MID, margin: "0 0 1.1rem", lineHeight: 1.5 }}>
                Your shop is fully configured and ready to take bookings.
              </p>
              <button
                onClick={() => setShowOverview(true)}
                style={{
                  background: G, color: BG, border: "none",
                  padding: "9px 20px", fontSize: "12px", fontWeight: 700,
                  letterSpacing: "0.05em", borderRadius: "3px", cursor: "pointer",
                }}
              >
                See everything Stand Tall can do →
              </button>
            </div>
          ) : (
            STEPS.map((step) => {
              const done       = stepsDone[step.id];
              const isExpanded = expanded === step.id;

              return (
                <div key={step.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : step.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "10px",
                      padding: "11px 14px", background: "transparent", border: "none",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {done
                      ? <CheckCircle2 size={15} style={{ color: G, flexShrink: 0 }} />
                      : <Circle      size={15} style={{ color: "rgba(255,255,255,0.18)", flexShrink: 0 }} />
                    }
                    <span style={{
                      fontSize: "13px", fontWeight: 500, flex: 1, minWidth: 0,
                      color: done ? "#6B7280" : FG,
                      textDecoration: done ? "line-through" : "none",
                    }}>
                      {step.title}
                    </span>
                    {!done && (
                      isExpanded
                        ? <ChevronUp   size={13} style={{ color: MID, flexShrink: 0 }} />
                        : <ChevronDown size={13} style={{ color: MID, flexShrink: 0 }} />
                    )}
                  </button>

                  {isExpanded && !done && (
                    <div style={{ padding: "0 14px 13px 39px" }}>
                      <p style={{ fontSize: "12px", color: MID, lineHeight: 1.65, margin: "0 0 10px" }}>
                        {step.desc}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <Link
                          to={step.link}
                          onClick={() => setMinimized(true)}
                          style={{
                            fontSize: "12px", color: G, fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          {step.linkLabel} →
                        </Link>
                        {step.manual && (
                          <button
                            onClick={() => markManualStep(step.id)}
                            style={{
                              background: "transparent",
                              border: "1px solid rgba(139,154,126,0.3)",
                              color: G, fontSize: "11px", padding: "3px 10px",
                              borderRadius: "2px", cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Mark as done ✓
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showOverview && <FeatureOverview onClose={markOverviewSeen} />}
    </>
  );
}

export default function SetupChecklist() {
  const { isOwner, currentBarber } = usePermissions();
  const shopId = currentBarber?.shop_id;

  if (!isOwner || !shopId) return null;
  return <Inner shopId={shopId} />;
}
