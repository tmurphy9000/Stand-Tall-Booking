import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const BG     = "#0D0D0D";
const FG     = "#F2F0EB";
const G      = "#8B9A7E";
const BORDER = "#1C1C1C";
const MID    = "#6B7280";

const TIER_LABELS = [
  { max: 300,   rate: 0.10, label: "10%" },
  { max: 800,   rate: 0.20, label: "20%" },
  { max: 2000,  rate: 0.30, label: "30%" },
  { max: 5000,  rate: 0.40, label: "40%" },
  { max: Infinity, rate: 0.50, label: "50%" },
];

function fmt(n) {
  return `$${Number(n ?? 0).toFixed(2)}`;
}

function monthLabel(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "20px 24px", flex: 1, minWidth: "160px" }}>
      <p style={{ margin: "0 0 6px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: MID }}>{label}</p>
      <p style={{ margin: "0 0 2px", fontSize: "26px", fontWeight: 700, color: FG, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.02em" }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: "11px", color: MID }}>{sub}</p>}
    </div>
  );
}

// ── Sign-in screen ─────────────────────────────────────────────────────────────
function SignInScreen() {
  const [email, setEmail]         = useState("");
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [err, setErr]             = useState("");

  async function handleSend() {
    const e = email.trim().toLowerCase();
    if (!e) { setErr("Please enter your email address."); return; }
    setSending(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: window.location.href },
    });
    setSending(false);
    if (error) { setErr(error.message); return; }
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "0.12em", color: G, margin: "0 0 2rem" }}>STAND TALL BOOKING</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(32px,5vw,48px)", color: FG, margin: "0 0 0.5rem", letterSpacing: "0.02em" }}>Affiliate Portal</h2>

        {sent ? (
          <>
            <p style={{ fontSize: "14px", color: MID, lineHeight: 1.7, marginBottom: "1.5rem" }}>
              Check your inbox for a sign-in link — it expires in 10 minutes. You can close this tab once you click it.
            </p>
            <button onClick={() => setSent(false)}
              style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MID, padding: "10px 20px", fontSize: "12px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" }}>
              Use a different email
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: "14px", color: MID, lineHeight: 1.7, marginBottom: "1.5rem" }}>
              Enter the email address associated with your affiliate account and we'll send you a sign-in link.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="you@example.com"
                style={{ padding: "13px 16px", background: "#111", border: `1px solid ${BORDER}`, color: FG, fontSize: "14px", borderRadius: "4px", fontFamily: "inherit", outline: "none" }}
              />
              {err && <p style={{ margin: 0, fontSize: "12px", color: "#F87171" }}>{err}</p>}
              <button onClick={handleSend} disabled={sending}
                style={{ background: G, color: BG, border: "none", padding: "13px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" }}>
                {sending ? "Sending…" : "SEND SIGN-IN LINK →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Deactivated screen ────────────────────────────────────────────────────────
function DeactivatedScreen({ onSignOut }) {
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "0.12em", color: G, margin: "0 0 2rem" }}>STAND TALL BOOKING</p>
        <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#1c1c1c", border: "1px solid #333", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18.364 5.636L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={MID} strokeWidth="1.5" strokeLinecap="round" /></svg>
        </div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "36px", color: FG, margin: "0 0 0.75rem", letterSpacing: "0.02em" }}>Account Deactivated</h2>
        <p style={{ fontSize: "14px", color: MID, lineHeight: 1.7, marginBottom: "2rem" }}>
          Your affiliate account has been deactivated. Your promo code is no longer active. Historical commission data has been retained.
        </p>
        <p style={{ fontSize: "13px", color: MID, marginBottom: "2rem" }}>
          If you believe this is a mistake, contact{" "}
          <a href="mailto:Tanner@standtallbarbering.com" style={{ color: G, textDecoration: "none" }}>Tanner@standtallbarbering.com</a>.
        </p>
        <button onClick={onSignOut}
          style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MID, padding: "10px 20px", fontSize: "12px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function AffiliateDashboard() {
  const [loading, setLoading]           = useState(true);
  const [session, setSession]           = useState(null);
  const [affiliate, setAffiliate]       = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [commissionLog, setCommissionLog] = useState([]);
  const [currentMonthData, setCurrentMonthData] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadData(s.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadData(s.user.id);
      else { setLoading(false); setAffiliate(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadData(userId) {
    setLoading(true);
    const { data: aff } = await supabase
      .from("affiliates")
      .select("id, name, email, promo_code, application_status, applied_at")
      .eq("auth_user_id", userId)
      .maybeSingle();

    setAffiliate(aff);

    if (aff?.application_status === "approved") {
      const [refRes, logRes, curRes] = await Promise.all([
        supabase.from("affiliate_referrals").select("id", { count: "exact", head: true }).eq("affiliate_id", aff.id),
        supabase.from("affiliate_commission_log").select("month, total_revenue_generated, commission_rate_applied, commission_amount").eq("affiliate_id", aff.id).order("month", { ascending: false }),
        supabase.rpc("get_my_affiliate_commission"),
      ]);
      setReferralCount(refRes.count ?? 0);
      setCommissionLog(logRes.data ?? []);
      setCurrentMonthData(curRes.data?.[0] ?? null);
    }

    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", border: `3px solid ${G}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) return <SignInScreen />;

  if (!affiliate) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <div style={{ textAlign: "center", maxWidth: "380px" }}>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "0.12em", color: G, margin: "0 0 2rem" }}>STAND TALL BOOKING</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "36px", color: FG, margin: "0 0 0.75rem", letterSpacing: "0.02em" }}>No affiliate account found</h2>
          <p style={{ fontSize: "14px", color: MID, lineHeight: 1.7, marginBottom: "2rem" }}>
            This portal is for approved affiliates only. If you applied and haven't heard back yet, we'll be in touch.
          </p>
          <button onClick={handleSignOut}
            style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MID, padding: "10px 20px", fontSize: "12px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (affiliate.application_status === "terminated") {
    return <DeactivatedScreen onSignOut={handleSignOut} />;
  }

  // ── Compute stats ──────────────────────────────────────────────────────────
  const totalCommissionAllTime = commissionLog.reduce((s, r) => s + Number(r.commission_amount), 0);

  const currentRevenue = Number(currentMonthData?.total_revenue_generated ?? 0);
  const currentRate    = Number(currentMonthData?.commission_rate_applied ?? 0);
  const currentCommission = Number(currentMonthData?.commission_amount ?? 0);

  const tier = TIER_LABELS.find(t => currentRevenue < t.max) ?? TIER_LABELS.at(-1);
  const nextTier = TIER_LABELS[TIER_LABELS.indexOf(tier) + 1];

  const chartData = [...commissionLog].reverse().map(r => ({
    month: monthLabel(r.month),
    revenue: Number(r.total_revenue_generated),
    commission: Number(r.commission_amount),
  }));

  return (
    <div style={{ minHeight: "100vh", background: BG, color: FG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "0 1.5rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "0.1em", color: G }}>STAND TALL BOOKING</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "13px", color: MID }}>{affiliate.email}</span>
          <button onClick={handleSignOut}
            style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MID, padding: "6px 14px", fontSize: "11px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Page title + promo code */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(32px,5vw,48px)", color: FG, margin: "0 0 0.5rem", letterSpacing: "0.02em" }}>
            {affiliate.name.split(" ")[0]}'s Dashboard
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "13px", color: MID }}>Your promo code:</p>
            <code style={{ background: "#1a1a1a", border: `1px solid ${G}44`, color: G, padding: "4px 14px", borderRadius: "4px", fontSize: "16px", fontWeight: 700, letterSpacing: "0.1em" }}>
              {affiliate.promo_code}
            </code>
            <p style={{ margin: 0, fontSize: "12px", color: MID }}>Share this anywhere to earn commission on referred signups.</p>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "2rem" }}>
          <StatCard label="Total Referrals" value={referralCount} sub="shops that used your code" />
          <StatCard
            label="This Month (est.)"
            value={fmt(currentCommission)}
            sub={`${(currentRate * 100).toFixed(0)}% of ${fmt(currentRevenue)} revenue`}
          />
          <StatCard
            label="All-time Commission"
            value={fmt(totalCommissionAllTime)}
            sub="sum of all monthly snapshots"
          />
        </div>

        {/* Commission tier */}
        <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "16px 20px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: MID }}>Current tier</span>
            <span style={{ background: G + "22", border: `1px solid ${G}44`, color: G, padding: "3px 12px", borderRadius: "99px", fontSize: "13px", fontWeight: 600 }}>{tier.label}</span>
          </div>
          {nextTier && (
            <p style={{ margin: 0, fontSize: "12px", color: MID }}>
              Reach <strong style={{ color: FG }}>{fmt(nextTier.max === Infinity ? 5000 : nextTier.max)}/mo</strong> in referred revenue to unlock <strong style={{ color: FG }}>{nextTier.label}</strong>
            </p>
          )}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "20px", marginBottom: "2rem" }}>
            <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 600, color: FG }}>Monthly Revenue Generated</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: MID, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${v}`} tick={{ fill: MID, fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px" }}
                  labelStyle={{ color: FG, marginBottom: "4px" }}
                  formatter={(v, name) => [fmt(v), name === "revenue" ? "Revenue generated" : "Commission earned"]}
                />
                <Bar dataKey="revenue" fill={G + "55"} radius={[3, 3, 0, 0]} name="revenue" />
                <Bar dataKey="commission" fill={G} radius={[3, 3, 0, 0]} name="commission" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: G + "55" }} />
                <span style={{ fontSize: "11px", color: MID }}>Revenue generated</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: G }} />
                <span style={{ fontSize: "11px", color: MID }}>Commission earned</span>
              </div>
            </div>
          </div>
        )}

        {/* Commission history table */}
        <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: FG }}>Commission History</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: MID }}>Snapshots are calculated on the 2nd of each month for the prior month.</p>
          </div>
          {commissionLog.length === 0 ? (
            <p style={{ padding: "24px 20px", margin: 0, fontSize: "13px", color: MID }}>
              No commission history yet — snapshots appear the month after your first referral signs up.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Month", "Revenue Generated", "Rate", "Commission"].map(h => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: "11px", color: MID, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissionLog.map((r, i) => (
                  <tr key={r.month} style={{ borderBottom: i < commissionLog.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <td style={{ padding: "12px 20px", fontSize: "13px", color: FG }}>{monthLabel(r.month)}</td>
                    <td style={{ padding: "12px 20px", fontSize: "13px", color: MID }}>{fmt(r.total_revenue_generated)}</td>
                    <td style={{ padding: "12px 20px", fontSize: "13px", color: MID }}>{(r.commission_rate_applied * 100).toFixed(0)}%</td>
                    <td style={{ padding: "12px 20px", fontSize: "13px", color: G, fontWeight: 600 }}>{fmt(r.commission_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "11px", color: "#444" }}>
          Commissions are calculated monthly and paid out manually by Stand Tall Booking. Contact <a href="mailto:Tanner@standtallbarbering.com" style={{ color: MID, textDecoration: "none" }}>Tanner@standtallbarbering.com</a> with payout questions.
        </p>
      </div>
    </div>
  );
}
