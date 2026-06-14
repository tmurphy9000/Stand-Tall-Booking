import { useState, useEffect, Fragment } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── DESIGN TOKENS ───────────────────────────────────────────
// Palette: near-black #0D0D0D, off-white #F2F0EB, brand green #8B9A7E,
//          dark green #6B7A5E, gold #C9A84C, steel #3A3A3A, muted #6B7280
// Type: Bebas Neue (display), Inter (body/ui)
// Signature: the questionnaire steps feel like a real conversation,
//            not a form — one question at a time, big type, minimal chrome

const G = "#8B9A7E";
const DG = "#6B7A5E";
const GOLD = "#C9A84C";
const BG = "#0D0D0D";
const FG = "#F2F0EB";
const MID = "#6B7280";
const BORDER = "#1C1C1C";

// ─── NAV ─────────────────────────────────────────────────────
function Nav({ tab, setTab }) {
  return (
    <nav style={{position:"sticky", top:0, zIndex:50, background:BG, borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 2.5rem", height:"60px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.08em", color:G}}>STAND TALL BOOKING</span>
      <div style={{display:"flex", gap:"4px"}}>
        {["Home","Pricing","Terms","Join Today","Login"].map(t => (
          <button key={t} onClick={() => t === "Terms" ? window.location.href = '/terms' : setTab(t)} style={{
            background: tab === t ? G : "transparent",
            color: tab === t ? BG : MID,
            border: "none", cursor:"pointer",
            fontSize:"12px", fontWeight:500, letterSpacing:"0.06em",
            padding:"7px 16px", borderRadius:"2px",
            transition:"all 0.15s",
          }}>{t.toUpperCase()}</button>
        ))}
      </div>
    </nav>
  );
}

// ─── HOME TAB ────────────────────────────────────────────────
function HomeTab({ setTab }) {
  const whyPoints = [
    { title:"Flat-rate pricing", body:"One price covers your whole team. No per-barber fees that balloon as you grow." },
    { title:"SMS & email included", body:"Confirmations and reminders built in at every tier — no add-on required." },
    { title:"No client-side fees", body:"Your clients book without paying a convenience fee. That money stays in your chair." },
    { title:"Built for barbershops", body:"Not adapted from salon software. Every feature was designed around how barbershops actually run." },
    { title:"AI from day one", body:"An AI assistant is included on every plan. Voice agent available as an add-on." },
    { title:"Guest booking", body:"Clients book without creating an account — less friction, more appointments." },
    { title:"Check-in kiosk", body:"A dedicated tablet app for walk-ins and client check-in — free on every plan." },
    { title:"Cancel any time", body:"No contracts, no lock-in. If we're not the right fit, cancel with one click — no questions asked." },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{minHeight:"90vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"5rem 2rem", position:"relative", overflow:"hidden"}}>
        <div style={{position:"absolute", top:"1.25rem", left:"1.5rem", fontSize:"11px", fontWeight:500, color:MID, letterSpacing:"0.04em"}}>No contracts, no bull$#!*.</div>
        <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", opacity:0.04}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"38vw", color:G, letterSpacing:"-0.05em", userSelect:"none", lineHeight:1}}>STB</span>
        </div>
        <p style={{fontSize:"11px", letterSpacing:"0.2em", color:G, fontWeight:500, marginBottom:"1.5rem", textTransform:"uppercase"}}>Stand Tall Booking</p>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(42px,7.5vw,96px)", letterSpacing:"0.01em", lineHeight:1.02, margin:"0 auto 2rem", color:FG, maxWidth:"860px"}}>
          Made by a barber who got tired of bad software.
        </h1>
        <p style={{fontSize:"17px", color:"#D1D5DB", maxWidth:"500px", margin:"0 auto 3rem", lineHeight:1.75}}>
          Booking, scheduling, client management, payroll, and AI tools — built specifically for barbershops. No hidden fees. No bloat. No nonsense.
        </p>
        <div style={{display:"flex", gap:"12px", flexWrap:"wrap", justifyContent:"center"}}>
          <button onClick={() => setTab("Join Today")} style={{background:G, color:BG, border:"none", padding:"13px 32px", fontSize:"13px", fontWeight:600, letterSpacing:"0.08em", borderRadius:"2px", cursor:"pointer"}}>
            GET STARTED →
          </button>
          <button onClick={() => setTab("Pricing")} style={{background:"transparent", color:FG, border:`1px solid ${BORDER}`, padding:"13px 32px", fontSize:"13px", fontWeight:500, letterSpacing:"0.08em", borderRadius:"2px", cursor:"pointer"}}>
            SEE PRICING
          </button>
        </div>
        <div style={{width:"40px", height:"2px", background:G, margin:"5rem auto 0"}} />
      </div>

      {/* Why Stand Tall */}
      <div style={{maxWidth:"1100px", margin:"0 auto", padding:"4rem 2rem"}}>
        <p style={{fontSize:"11px", letterSpacing:"0.14em", color:G, textTransform:"uppercase", fontWeight:500, marginBottom:"2rem"}}>Why Stand Tall</p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:"1px", background:"transparent", border:`1px solid ${BORDER}`, borderRadius:"4px", overflow:"hidden"}}>
          {whyPoints.map((p, i) => (
            <div key={i} style={{background:BG, padding:"1.75rem 2rem"}}>
              <div style={{fontSize:"13px", fontWeight:700, color:FG, marginBottom:"6px"}}>{p.title}</div>
              <div style={{fontSize:"13px", color:"#D1D5DB", lineHeight:1.65}}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor cards */}
      <div style={{borderTop:`1px solid ${BORDER}`, borderBottom:`1px solid ${BORDER}`, padding:"3rem 2rem"}}>
        <p style={{fontSize:"11px", letterSpacing:"0.14em", color:"#D1D5DB", textTransform:"uppercase", fontWeight:500, marginBottom:"1.5rem", textAlign:"center"}}>How we stack up</p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(190px, 1fr))", gap:"10px", maxWidth:"1100px", margin:"0 auto"}}>
          {[
            {name:"Booksy", price:"$29.99 + $20/barber/mo", cons:["5 barbers = ~$110/mo","Clients must create accounts","No AI tools at any price point"]},
            {name:"Vagaro", price:"~$30/mo per user", cons:["Constant upselling","Steep learning curve","Built for salons, not barbers"]},
            {name:"Squire", price:"~$30+/mo, opaque", cons:["Charges clients $1–$3 per booking","Must call for pricing","Long-term contracts"]},
            {name:"Square Appts", price:"Free → $29/mo", cons:["Team features very limited","No SMS without add-ons","No payroll or AI tools"]},
            {name:"Fresha", price:"$20/mo or per seat", cons:["Transaction fees on bookings","Limited branding control","Weak multi-location support"]},
            {name:"Mangomint", price:"$165–$375/mo", cons:["Out of reach for most shops","Overkill complexity","No AI voice agent"]},
            {name:"Stand Tall", price:"$29–$149/mo flat", highlight:true, pros:["No per-barber fees ever","SMS & email included free","AI assistant on every plan","No hidden client fees","Check-in kiosk — free on every plan"]},
          ].map((c, i) => (
            <div key={i} style={{background: c.highlight ? "#141414" : "#111", border: c.highlight ? `1px solid ${G}` : `1px solid ${BORDER}`, borderRadius:"4px", padding:"1rem 1.1rem"}}>
              <div style={{fontSize:"12px", fontWeight:600, color: c.highlight ? G : FG, marginBottom:"2px"}}>{c.name}</div>
              <div style={{fontSize:"11px", color: c.highlight ? DG : MID, marginBottom:"8px", fontWeight: c.highlight ? 500 : 400}}>{c.price}</div>
              <div style={{borderTop:`1px solid ${BORDER}`, paddingTop:"8px"}}>
                {c.highlight ? c.pros.map((p, j) => (
                  <div key={j} style={{display:"flex", gap:"6px", marginBottom:"3px"}}>
                    <span style={{color:G, fontSize:"10px", flexShrink:0}}>✓</span>
                    <span style={{fontSize:"11px", color:"#D1D5DB", lineHeight:1.4}}>{p}</span>
                  </div>
                )) : c.cons.map((d, j) => (
                  <div key={j} style={{display:"flex", gap:"6px", marginBottom:"3px"}}>
                    <span style={{color:"#7F1D1D", fontSize:"10px", flexShrink:0}}>–</span>
                    <span style={{fontSize:"11px", color:"#C9CAD0", lineHeight:1.4}}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{padding:"6rem 2rem", textAlign:"center"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(32px,5vw,60px)", color:FG, margin:"0 0 1rem", letterSpacing:"0.02em"}}>
          Ready to run your shop on your terms?
        </h2>
        <p style={{fontSize:"15px", color:"#D1D5DB", marginBottom:"2.5rem"}}>Month 1 at your chosen rate. Month 2 on us.</p>
        <button onClick={() => setTab("Join Today")} style={{background:G, color:BG, border:"none", padding:"14px 40px", fontSize:"13px", fontWeight:600, letterSpacing:"0.1em", borderRadius:"2px", cursor:"pointer"}}>
          JOIN TODAY →
        </button>
      </div>
    </div>
  );
}

// ─── PRICING TAB ─────────────────────────────────────────────
function PricingTab({ setTab }) {
  const [showTable, setShowTable] = useState(false);

  const tiers = [
    { id:"basic", name:"Basic", price:"$29", per:"/ mo", sub:"1 barber · 1 location", desc:"Everything a solo barber needs to look professional and stay booked.", highlight:false, enterprise:false },
    { id:"pro", name:"Pro", price:"$79", per:"/ mo", sub:"Up to 10 barbers · 1 location", desc:"The full shop experience. Team tools, AI features, and flat-rate pricing that doesn't punish growth.", highlight:true, enterprise:false },
    { id:"elite", name:"Elite", price:"$149", per:"/ mo per location", sub:"Up to 12 barbers · up to 5 locations", desc:"Multi-location ownership, centralized control, and custom branding per shop.", highlight:false, enterprise:false },
    { id:"enterprise", name:"Enterprise", price:"Custom", per:"pricing", sub:"Unlimited barbers · unlimited locations", desc:"For large chains and franchise groups. White-labeling, dedicated support, and negotiated rates.", highlight:false, enterprise:true },
  ];

  const features = [
    { category:"Booking & scheduling", rows:[
      { label:"Online booking page", basic:true, pro:true, elite:true, enterprise:true },
      { label:"Guest booking — no account required", basic:true, pro:true, elite:true, enterprise:true },
      { label:"Back-to-back bookings", basic:true, pro:true, elite:true, enterprise:true },
      { label:"Next available slot finder", basic:true, pro:true, elite:true, enterprise:true },
      { label:"Cancellation policy toggle", basic:true, pro:true, elite:true, enterprise:true },
      { label:"Google / Apple Calendar sync", basic:true, pro:true, elite:true, enterprise:true },
      { label:"Schedule optimizer", basic:false, pro:true, elite:true, enterprise:true },
      { label:"Check-in kiosk (tablet app)", basic:true, pro:true, elite:true, enterprise:true },
    ]},
    { category:"Notifications", rows:[
      { label:"Email confirmations & reminders", basic:true, pro:true, elite:true, enterprise:true },
      { label:"SMS notifications", basic:true, pro:true, elite:true, enterprise:true },
    ]},
    { category:"Team & staff", rows:[
      { label:"Barbers", basic:"1", pro:"Up to 10", elite:"Up to 12/location", enterprise:"Unlimited" },
      { label:"Locations", basic:"1", pro:"1", elite:"Up to 5", enterprise:"Unlimited" },
      { label:"Role-based access", basic:false, pro:true, elite:true, enterprise:true },
      { label:"Commission tracking", basic:false, pro:true, elite:true, enterprise:true },
    ]},
    { category:"Financials", rows:[
      { label:"Quick checkout", basic:true, pro:true, elite:true, enterprise:true },
      { label:"Cash tracker", basic:true, pro:true, elite:true, enterprise:true },
      { label:"Payroll", basic:"—", pro:"Add-on", elite:"Add-on", enterprise:"Negotiated" },
      { label:"Reporting & analytics", basic:"Basic", pro:"Full", elite:"Full", enterprise:"Advanced" },
    ]},
    { category:"AI features", rows:[
      { label:"AI assistant chat bubble", basic:true, pro:true, elite:true, enterprise:true },
      { label:"AI client import", basic:false, pro:true, elite:true, enterprise:true },
      { label:"AI voice agent", basic:"+$99.99/mo", pro:"+$99.99/mo", elite:"+$99.99/mo", enterprise:"Negotiated" },
    ]},
  ];

  const Check = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{display:"inline-block",verticalAlign:"middle"}}>
      <circle cx="8" cy="8" r="8" fill={G} fillOpacity="0.15"/>
      <path d="M4.5 8.5L7 11L11.5 6" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div style={{maxWidth:"1100px", margin:"0 auto", padding:"4rem 2rem"}}>
      <p style={{fontSize:"11px", letterSpacing:"0.15em", color:G, fontWeight:500, marginBottom:"1rem", textTransform:"uppercase"}}>Pricing</p>
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(40px,6vw,72px)", letterSpacing:"0.02em", lineHeight:1, margin:"0 0 1rem", color:FG}}>Simple pricing.<br/>No surprises.</h2>
      <p style={{fontSize:"15px", color:"#D1D5DB", maxWidth:"480px", marginBottom:"3rem", lineHeight:1.7}}>Every tier includes SMS and email at no extra cost. No per-barber fees. No hidden charges to your clients. Month 2 free when you sign up today.</p>

      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:"12px", marginBottom:"3rem"}}>
        {tiers.map(t => (
          <div key={t.id} style={{background:t.highlight?"#141414":BG, border:t.highlight?`1px solid ${G}`:t.enterprise?`1px solid ${GOLD}`:`1px solid ${BORDER}`, borderRadius:"4px", padding:"1.75rem 1.5rem", display:"flex", flexDirection:"column", position:"relative"}}>
            {t.highlight && <div style={{position:"absolute", top:"-1px", left:"50%", transform:"translateX(-50%)", background:G, color:BG, fontSize:"10px", fontWeight:600, letterSpacing:"0.1em", padding:"3px 14px", borderRadius:"0 0 4px 4px", textTransform:"uppercase", whiteSpace:"nowrap"}}>Most popular</div>}
            <div style={{fontSize:"11px", fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:t.enterprise?GOLD:t.highlight?G:MID, marginBottom:"1rem"}}>{t.name}</div>
            <div style={{marginBottom:"0.25rem"}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"42px", letterSpacing:"0.02em", color:FG}}>{t.price}</span>
              <span style={{fontSize:"13px", color:"#D1D5DB", marginLeft:"6px"}}>{t.per}</span>
            </div>
            <div style={{fontSize:"12px", color:"#D1D5DB", marginBottom:"1rem"}}>{t.sub}</div>
            <p style={{fontSize:"13px", color:"#D1D5DB", lineHeight:1.6, flex:1, marginBottom:"1.5rem"}}>{t.desc}</p>
            <button onClick={() => t.enterprise ? window.location.href="mailto:Tanner@standtallbarbering.com" : setTab("Join Today")} style={{display:"block", width:"100%", padding:"10px 0", fontSize:"13px", fontWeight:500, letterSpacing:"0.05em", cursor:"pointer", border:t.highlight?`1px solid ${G}`:t.enterprise?`1px solid ${GOLD}`:`1px solid #2D2D2D`, color:t.highlight?BG:t.enterprise?GOLD:FG, background:t.highlight?G:"transparent", borderRadius:"2px"}}>
              {t.enterprise ? "Contact us ↗" : "Get started →"}
            </button>
          </div>
        ))}
      </div>

      <div style={{textAlign:"center", marginBottom:"2rem"}}>
        <button onClick={() => setShowTable(v=>!v)} style={{background:"transparent", border:`1px solid #2D2D2D`, color:"#D1D5DB", fontSize:"13px", padding:"10px 24px", borderRadius:"2px", cursor:"pointer", letterSpacing:"0.05em"}}>
          {showTable ? "Hide features ↑" : "Compare all features ↓"}
        </button>
      </div>

      {showTable && (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%", borderCollapse:"collapse", fontSize:"13px", minWidth:"600px"}}>
            <thead>
              <tr>
                <th style={{textAlign:"left", padding:"10px 12px", color:"#4B5563", fontWeight:500, borderBottom:`1px solid ${BORDER}`, width:"36%"}}>Feature</th>
                {tiers.map(t => <th key={t.id} style={{textAlign:"center", padding:"10px 12px", fontWeight:500, borderBottom:`1px solid ${BORDER}`, color:t.highlight?G:t.enterprise?GOLD:MID, width:"16%"}}>{t.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {features.map(section => (
                <Fragment key={section.category}>
                  <tr><td colSpan={5} style={{padding:"10px 12px 6px", fontSize:"11px", letterSpacing:"0.1em", textTransform:"uppercase", color:"#4B5563", fontWeight:500, background:"#0A0A0A"}}>{section.category}</td></tr>
                  {section.rows.map(row => (
                    <tr key={row.label} style={{borderBottom:`1px solid #141414`}}>
                      <td style={{padding:"9px 12px", color:"#D1D5DB"}}>{row.label}</td>
                      {["basic","pro","elite","enterprise"].map(k => (
                        <td key={k} style={{textAlign:"center", padding:"9px 12px"}}>
                          {row[k] === true ? <Check /> : row[k] === false ? <span style={{color:"#4B5563"}}>—</span> : <span style={{fontSize:"12px", fontWeight:500, color:String(row[k]).startsWith("+")? G : ["Negotiated","Advanced","Unlimited"].includes(row[k])? GOLD : "#9CA3AF"}}>{row[k]}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{borderTop:`1px solid ${BORDER}`, marginTop:"4rem", padding:"4rem 0", textAlign:"center"}}>
        <p style={{fontSize:"11px", letterSpacing:"0.12em", color:GOLD, textTransform:"uppercase", fontWeight:500, marginBottom:"1rem"}}>Enterprise</p>
        <h3 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(28px,4vw,48px)", letterSpacing:"0.02em", margin:"0 0 1rem", color:FG}}>Running more than 5 locations?</h3>
        <p style={{fontSize:"15px", color:"#D1D5DB", maxWidth:"400px", margin:"0 auto 2rem", lineHeight:1.7}}>Custom plan, white-labeling, dedicated support, and pricing that scales with you.</p>
        <a href="mailto:Tanner@standtallbarbering.com" style={{display:"inline-block", padding:"12px 32px", background:"transparent", border:`1px solid ${GOLD}`, color:GOLD, fontSize:"13px", fontWeight:500, letterSpacing:"0.08em", textDecoration:"none", borderRadius:"2px"}}>Contact us ↗</a>
      </div>
    </div>
  );
}

// ─── JOIN TODAY TAB ──────────────────────────────────────────
const questions = [
  { id:"shop_type", type:"choice", label:"Are you a solo barber, or do you manage more than one barber?", choices:["Just me — I'm a solo barber","I manage a team of barbers"] },
  { id:"barbers_current", type:"number", label:"How many barbers are currently working in your shop?", placeholder:"e.g. 4" },
  { id:"barbers_capacity", type:"number", label:"How many barbers does your shop run at full capacity?", placeholder:"e.g. 6" },
  { id:"model", type:"choice", label:"What's your shop's pay structure?", choices:["Booth rent","Commission","Both"] },
  { id:"current_software", type:"text", label:"What booking software are you using now?", placeholder:"e.g. Vagaro, Booksy, paper calendar…" },
  { id:"biggest_complaint", type:"textarea", label:"What's your biggest frustration with your current software?", placeholder:"Tell us what drives you crazy…" },
  { id:"biggest_like", type:"textarea", label:"Is there anything you actually like about it?", placeholder:"Anything you'd want us to keep in mind…" },
  { id:"plan", type:"plan", label:"Which plan is right for your shop?" },
  { id:"name", type:"text", label:"What's your name?", placeholder:"First and last" },
  { id:"terms", type:"terms", label:"Before we get started — a few things to know." },
  { id:"email", type:"email", label:"Your email address", placeholder:"you@example.com" },
  { id:"phone", type:"tel", label:"Best phone number to reach you", placeholder:"(555) 555-5555" },
];

function JoinTab() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [stage, setStage] = useState("questionnaire"); // questionnaire | account | verify | done
  const [submitting, setSubmitting] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirm, setAccountConfirm] = useState("");
  const [accountError, setAccountError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState({ terms: false, smsEmail: false, age: false });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStage("done");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const planOptions = [
    {
      id:"Basic — $29/mo", name:"Basic", price:"$29/mo", tag:"Solo barber",
      pros:["Online booking page","Guest booking — no account required","SMS & email notifications included","AI assistant chat bubble","Client list & CSV export","Cash tracker & quick checkout","Google / Apple Calendar sync","Check-in kiosk (tablet app)"],
      cons:["1 barber only","No team roles or permissions","No commission tracking","No schedule optimizer","No AI client import"],
    },
    {
      id:"Pro — $79/mo", name:"Pro", price:"$79/mo", tag:"Most popular · up to 10 barbers", highlight:true,
      pros:["Up to 10 barbers — one flat price","Role-based access (owner / manager / barber)","Barber invite flow","Commission tracking","AI client import (CSV / Excel / PDF)","Schedule optimizer","Full reporting & analytics","Payroll available as add-on","Check-in kiosk (tablet app)"],
      cons:["Single location only","Payroll is an additional cost"],
    },
    {
      id:"Elite — $149/mo per location", name:"Elite", price:"$149/mo", tag:"Per location · up to 5 locations", gold:true,
      pros:["Up to 12 barbers per location","Up to 5 locations","Custom branding per location","Centralized multi-location dashboard","Everything in Pro included","Best value for growing chains","Check-in kiosk (tablet app)"],
      cons:["Capped at 5 locations","Payroll is an additional cost"],
    },
  ];

  const PricingModal = () => (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"2rem 1rem"}}>
      <div style={{background:"#0D0D0D",border:`1px solid ${BORDER}`,borderRadius:"6px",width:"100%",maxWidth:"1020px",padding:"2.5rem",position:"relative"}}>
        <button onClick={()=>setPricingModalOpen(false)} style={{position:"absolute",top:"1.25rem",right:"1.25rem",background:"transparent",border:`1px solid ${BORDER}`,color:"#D1D5DB",fontSize:"13px",padding:"6px 14px",borderRadius:"2px",cursor:"pointer",fontFamily:"inherit"}}>Close ✕</button>
        <p style={{fontSize:"11px",letterSpacing:"0.15em",color:G,textTransform:"uppercase",fontWeight:500,marginBottom:"0.5rem"}}>Full pricing breakdown</p>
        <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"36px",color:FG,margin:"0 0 2rem",letterSpacing:"0.02em"}}>Plans & competitor comparison</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"10px",marginBottom:"2.5rem"}}>
          {[
            {name:"Basic",price:"$29/mo",sub:"1 barber · 1 location",c:G,h:false},
            {name:"Pro",price:"$79/mo",sub:"Up to 10 barbers · 1 location",c:G,h:true},
            {name:"Elite",price:"$149/mo",sub:"Up to 12 barbers · 5 locations",c:GOLD,h:false},
            {name:"Enterprise",price:"Custom",sub:"Unlimited barbers & locations",c:GOLD,h:false,ent:true},
          ].map(t=>(
            <div key={t.name} style={{background:t.h?"#161616":BG,border:`1px solid ${t.h?G:t.c===GOLD?GOLD:BORDER}`,borderRadius:"4px",padding:"1.25rem",position:"relative"}}>
              {t.h&&<div style={{position:"absolute",top:"-1px",left:"50%",transform:"translateX(-50%)",background:G,color:BG,fontSize:"9px",fontWeight:600,letterSpacing:"0.1em",padding:"2px 12px",borderRadius:"0 0 4px 4px",textTransform:"uppercase",whiteSpace:"nowrap"}}>Most popular</div>}
              <div style={{fontSize:"10px",fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",color:t.c,marginBottom:"0.5rem"}}>{t.name}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",color:FG,letterSpacing:"0.02em"}}>{t.price}</div>
              <div style={{fontSize:"11px",color:"#D1D5DB",marginTop:"2px"}}>{t.sub}</div>
              {t.ent&&<a href="mailto:Tanner@standtallbarbering.com" style={{display:"block",marginTop:"0.75rem",fontSize:"11px",color:GOLD,textDecoration:"none"}}>Contact us ↗</a>}
            </div>
          ))}
        </div>
        <p style={{fontSize:"11px",letterSpacing:"0.12em",color:"#D1D5DB",textTransform:"uppercase",fontWeight:500,marginBottom:"1rem"}}>How we compare to the competition</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:"10px"}}>
          {[
            {name:"Booksy",price:"$29.99 + $20/barber/mo",cons:["5 barbers = ~$110/mo","Clients must create accounts","No AI tools at any tier"]},
            {name:"Vagaro",price:"~$30/mo per user",cons:["Constant upselling","Steep learning curve","Built for salons, not barbers"]},
            {name:"Squire",price:"~$30+/mo, opaque",cons:["Charges clients $1–$3 per booking","Must call for pricing","Long-term contracts"]},
            {name:"Square Appts",price:"Free → $29/mo",cons:["Team features very limited","No SMS without add-ons","No payroll or AI tools"]},
            {name:"Fresha",price:"$20/mo or per seat",cons:["Transaction fees on bookings","Limited branding control","Weak multi-location support"]},
            {name:"Mangomint",price:"$165–$375/mo",cons:["Out of reach for most shops","Overkill complexity","No AI voice agent"]},
          ].map(c=>(
            <div key={c.name} style={{background:"#111",border:`1px solid ${BORDER}`,borderRadius:"4px",padding:"0.9rem 1rem"}}>
              <div style={{fontSize:"12px",fontWeight:600,color:FG,marginBottom:"2px"}}>{c.name}</div>
              <div style={{fontSize:"11px",color:"#D1D5DB",marginBottom:"8px"}}>{c.price}</div>
              <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:"6px"}}>
                {c.cons.map((d,i)=>(
                  <div key={i} style={{display:"flex",gap:"6px",marginBottom:"3px"}}>
                    <span style={{color:"#7F1D1D",fontSize:"10px",flexShrink:0}}>–</span>
                    <span style={{fontSize:"11px",color:"#C9CAD0",lineHeight:1.4}}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const q = questions[step];
  const val = answers[q?.id] || "";
  const progress = ((step) / questions.length) * 100;
  const isLast = step === questions.length - 1;

  function handleNext() {
    if (isLast) { handleSubmit(); return; }
    setStep(s => s + 1);
  }

  function handleBack() { setStep(s => Math.max(0, s - 1)); }

  async function handleSubmit() {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));
    setSubmitting(false);
    setAccountEmail(answers.email || "");
    setStage("account");
  }

  async function handleCreateAccount() {
    setAccountError("");
    if (!accountEmail) { setAccountError("Please enter your email."); return; }
    if (accountPassword.length < 8) { setAccountError("Password must be at least 8 characters."); return; }
    if (accountPassword !== accountConfirm) { setAccountError("Passwords don't match."); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: accountEmail,
      password: accountPassword,
      options: { data: { ...answers }, emailRedirectTo: "https://www.standtallbooking.com" },
    });
    setSubmitting(false);
    if (error) { setAccountError(error.message); return; }
    setStage("verify");
  }

  async function handleResendEmail() {
    setVerifyError("");
    setResendStatus("");
    setSubmitting(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: accountEmail });
    setSubmitting(false);
    if (error) { setVerifyError(error.message); return; }
    setResendStatus("Email sent! Check your inbox.");
  }

  // ── Account creation screen ──
  if (stage === "account") return (
    <div style={{minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"4rem 2rem"}}>
      <div style={{width:"100%", maxWidth:"420px"}}>
        <div style={{width:"36px", height:"2px", background:G, marginBottom:"2rem"}} />
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(32px,5vw,52px)", color:FG, margin:"0 0 0.5rem", letterSpacing:"0.02em"}}>Create your account.</h2>
        <p style={{fontSize:"14px", color:"#D1D5DB", marginBottom:"2rem", lineHeight:1.65}}>Almost there. Set your login credentials and we'll send a verification code to confirm your email.</p>
        <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>
          <div>
            <label style={{fontSize:"11px", letterSpacing:"0.1em", color:"#D1D5DB", textTransform:"uppercase", fontWeight:500, display:"block", marginBottom:"6px"}}>Email address</label>
            <input type="email" value={accountEmail} onChange={e=>setAccountEmail(e.target.value)} placeholder="you@example.com"
              style={{width:"100%", padding:"13px 16px", background:"#111", border:`1px solid ${BORDER}`, color:FG, fontSize:"14px", borderRadius:"4px", fontFamily:"inherit", outline:"none", boxSizing:"border-box"}} />
          </div>
          <div>
            <label style={{fontSize:"11px", letterSpacing:"0.1em", color:"#D1D5DB", textTransform:"uppercase", fontWeight:500, display:"block", marginBottom:"6px"}}>Choose a password</label>
            <input type="password" value={accountPassword} onChange={e=>setAccountPassword(e.target.value)} placeholder="At least 8 characters"
              style={{width:"100%", padding:"13px 16px", background:"#111", border:`1px solid ${BORDER}`, color:FG, fontSize:"14px", borderRadius:"4px", fontFamily:"inherit", outline:"none", boxSizing:"border-box"}} />
          </div>
          <div>
            <label style={{fontSize:"11px", letterSpacing:"0.1em", color:"#D1D5DB", textTransform:"uppercase", fontWeight:500, display:"block", marginBottom:"6px"}}>Confirm password</label>
            <input type="password" value={accountConfirm} onChange={e=>setAccountConfirm(e.target.value)} placeholder="Re-enter your password"
              onKeyDown={e=>{ if(e.key==="Enter") handleCreateAccount(); }}
              style={{width:"100%", padding:"13px 16px", background:"#111", border:`1px solid ${BORDER}`, color:FG, fontSize:"14px", borderRadius:"4px", fontFamily:"inherit", outline:"none", boxSizing:"border-box"}} />
          </div>
          {accountError && <p style={{fontSize:"13px", color:"#F87171", margin:0}}>{accountError}</p>}
          <button onClick={handleCreateAccount} disabled={submitting}
            style={{background:G, color:BG, border:"none", padding:"13px", fontSize:"13px", fontWeight:600, letterSpacing:"0.08em", borderRadius:"2px", cursor:"pointer", marginTop:"4px", fontFamily:"inherit"}}>
            {submitting ? "Creating account…" : "CREATE ACCOUNT →"}
          </button>
        </div>
        <p style={{fontSize:"12px", color:"#D1D5DB", marginTop:"1.5rem", lineHeight:1.6}}>
          Your credentials are encrypted and stored securely. We never share your information.
        </p>
      </div>
    </div>
  );

  // ── Email verification screen ──
  if (stage === "verify") return (
    <div style={{minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"4rem 2rem"}}>
      <div style={{width:"100%", maxWidth:"420px", textAlign:"center"}}>
        <div style={{width:"56px", height:"56px", borderRadius:"50%", background:`${G}18`, border:`1px solid ${G}44`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 2rem"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 8L10.5 13.5L21 8M3 8H21V18C21 18.5523 20.5523 19 20 19H4C3.44772 19 3 18.5523 3 18V8Z" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(32px,5vw,52px)", color:FG, margin:"0 0 0.75rem", letterSpacing:"0.02em"}}>Check your email.</h2>
        <p style={{fontSize:"14px", color:"#D1D5DB", maxWidth:"340px", margin:"0 auto 2rem", lineHeight:1.7}}>
          We sent a verification link to <span style={{color:FG}}>{accountEmail}</span>. Click the link in that email to confirm your account — this page will continue automatically once you do.
        </p>
        <div style={{display:"flex", flexDirection:"column", gap:"12px", alignItems:"center"}}>
          {verifyError && <p style={{fontSize:"13px", color:"#F87171", margin:0}}>{verifyError}</p>}
          {resendStatus && <p style={{fontSize:"13px", color:G, margin:0}}>{resendStatus}</p>}
          <button onClick={handleResendEmail} disabled={submitting}
            style={{background:"transparent", border:`1px solid ${BORDER}`, color:"#D1D5DB", padding:"13px 32px", fontSize:"13px", fontWeight:500, letterSpacing:"0.06em", borderRadius:"2px", cursor:"pointer", fontFamily:"inherit"}}>
            {submitting ? "Sending…" : "Resend email"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Done / Getting Started screen ──
  if (stage === "done") {
    const steps = [
      { num:"01", title:"Set your shop hours", body:"Go to Settings → Shop Hours and set the days and times your shop is open. This controls when clients can book.", icon:"🕐" },
      { num:"02", title:"Add your services", body:"Head to Settings → Services and add your cuts, styles, and add-ons with prices and durations.", icon:"✂️" },
      { num:"03", title:"Invite your barbers", body:"Go to Team → Invite Barber. They'll get an email to set up their profile and login. Takes about 2 minutes.", icon:"👥" },
      { num:"04", title:"Set barber hours", body:"Once your barbers are in, set their individual availability under Team → select barber → Hours. Their schedule controls when they show up for booking.", icon:"📅" },
      { num:"05", title:"Set permissions", body:"Under Team → select barber → Permissions, choose what each barber can see and do. Managers get more access than service providers.", icon:"🔐" },
      { num:"06", title:"Upload photos", body:"Add your shop logo and barber profile photos under Settings → Branding. A complete profile builds client trust.", icon:"📷" },
      { num:"07", title:"Import your clients", body:"Go to Clients → Import and upload a CSV, Excel, or PDF export from your old software. Our AI will map the fields automatically. Takes a few seconds.", icon:"📋" },
      { num:"08", title:"Set your cancellation policy", body:"Under Settings → Booking, toggle your cancellation policy on and customize the message clients see at checkout.", icon:"📌" },
      { num:"09", title:"Set minimum booking notice", body:"In Settings → Booking, set how far in advance clients must book. Stops last-minute surprises.", icon:"⏱️" },
      { num:"10", title:"Share your booking link", body:"Your public booking page is live at standtallbooking.com/book. Put it in your Instagram bio, Google listing, and anywhere else clients find you.", icon:"🔗" },
      { num:"11", title:"Turn on the AI assistant", body:"The AI chat bubble is already active. It can answer client questions, help with scheduling, and more — right from your dashboard.", icon:"🤖" },
      { num:"12", title:"Run your first checkout", body:"When your first appointment wraps up, hit Quick Checkout to log the service, record payment, and track cash or commission.", icon:"💈" },
    ];

    return (
      <div style={{padding:"4rem 2rem", maxWidth:"860px", margin:"0 auto"}}>
        {/* Header */}
        <div style={{textAlign:"center", marginBottom:"4rem"}}>
          <div style={{width:"56px", height:"56px", borderRadius:"50%", background:`${G}22`, border:`1px solid ${G}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1.5rem"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 8" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(36px,5vw,60px)", color:FG, margin:"0 0 0.75rem", letterSpacing:"0.02em"}}>You're in. Let's get set up.</h2>
          <p style={{fontSize:"16px", color:"#D1D5DB", maxWidth:"460px", margin:"0 auto 0.5rem", lineHeight:1.75}}>
            Welcome to Stand Tall Booking. Follow these steps to get your shop running — most people are fully set up in under 20 minutes.
          </p>
          <p style={{fontSize:"14px", color:DG}}>Your second month is on us. Check {accountEmail} for your login details.</p>
        </div>

        {/* Steps */}
        <div style={{display:"flex", flexDirection:"column", gap:"2px"}}>
          {steps.map((s, i) => (
            <div key={i} style={{display:"flex", gap:"1.5rem", alignItems:"flex-start", padding:"1.25rem 1.5rem", background: i % 2 === 0 ? "#0F0F0F" : "#111", border:`1px solid ${BORDER}`, borderRadius: i===0?"4px 4px 0 0" : i===steps.length-1?"0 0 4px 4px":"0"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:G, letterSpacing:"0.05em", minWidth:"32px", lineHeight:1.2, marginTop:"2px"}}>{s.num}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"14px", fontWeight:700, color:FG, marginBottom:"4px"}}>{s.title}</div>
                <div style={{fontSize:"13px", color:"#D1D5DB", lineHeight:1.65}}>{s.body}</div>
              </div>
              <div style={{fontSize:"20px", flexShrink:0}}>{s.icon}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{textAlign:"center", marginTop:"3rem"}}>
          <button onClick={() => window.location.href="/Calendar"} style={{background:G, color:BG, border:"none", padding:"14px 40px", fontSize:"13px", fontWeight:600, letterSpacing:"0.1em", borderRadius:"2px", cursor:"pointer", fontFamily:"inherit"}}>
            TAKE ME TO MY DASHBOARD →
          </button>
          <p style={{fontSize:"12px", color:"#D1D5DB", marginTop:"1rem"}}>You can always come back to this guide under Help → Getting Started.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"80vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"4rem 2rem", position:"relative"}}>
      {pricingModalOpen && <PricingModal />}
      {/* Progress bar */}
      <div style={{width:"100%", maxWidth:"620px", marginBottom:"3rem"}}>
        <div style={{height:"2px", background:BORDER, borderRadius:"2px", overflow:"hidden"}}>
          <div style={{height:"100%", width:`${progress}%`, background:G, transition:"width 0.3s ease"}} />
        </div>
        <div style={{display:"flex", justifyContent:"space-between", marginTop:"8px"}}>
          <span style={{fontSize:"11px", color:MID}}>{step + 1} of {questions.length}</span>
          <span style={{fontSize:"11px", color:MID}}>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Question */}
      <div style={{width:"100%", maxWidth:"620px"}}>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(28px,4vw,42px)", color:FG, margin:"0 0 2rem", letterSpacing:"0.02em", lineHeight:1.1}}>{q.label}</h2>

        {q.type === "terms" ? (
          <div>
            {/* Scrollable T&C box */}
            <div style={{background:"#0A0A0A", border:`1px solid ${BORDER}`, borderRadius:"4px", padding:"1.5rem", maxHeight:"340px", overflowY:"auto", marginBottom:"1.5rem", fontSize:"12px", color:"#C9CAD0", lineHeight:1.75}}>
              <p style={{color:FG, fontWeight:500, fontSize:"13px", marginBottom:"1rem"}}>Stand Tall Booking — Terms of Service & Communications Consent</p>
              <p style={{marginBottom:"1rem", color:MID}}>Last updated: June 2026. Please read these terms carefully before creating your account.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>1. Acceptance of Terms</p>
              <p style={{marginBottom:"1rem"}}>By creating an account with Stand Tall Booking ("we," "us," or "our"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you may not use our service. These terms apply to all users of the platform, including barbershop owners, managers, barbers, and clients.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>2. Description of Service</p>
              <p style={{marginBottom:"1rem"}}>Stand Tall Booking provides a cloud-based barbershop management and booking platform including online appointment scheduling, client management, team management, payroll tracking, and AI-powered tools. We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>3. Subscription & Billing</p>
              <p style={{marginBottom:"1rem"}}>Your subscription begins on the date you create your account. You will be billed monthly at the rate of your chosen plan. Your first month is billed at full price. As a promotional offer, your second month will be credited automatically — no action required. Subscriptions automatically renew each month unless cancelled. You may cancel at any time and will retain access through the end of your current billing period. No refunds are issued for partial months. Prices are subject to change with 30 days notice.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>4. Add-On Services</p>
              <p style={{marginBottom:"1rem"}}>Certain features including Payroll and the AI Voice Agent are available as paid add-ons billed in addition to your base subscription. Payroll fees are passed through at cost. The AI Voice Agent add-on is $99.99/month per account. Add-ons may be added or removed at any time and changes take effect on the next billing cycle.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>5. SMS & Email Communications Consent</p>
              <p style={{marginBottom:"1rem"}}>By providing your phone number and email address, you expressly consent to receive SMS text messages and email communications from Stand Tall Booking. These communications may include: account verification codes, booking confirmations and reminders, appointment updates and cancellations, billing notifications, product updates and announcements, and promotional offers related to Stand Tall Booking services. SMS messages are sent via shortcode or toll-free number. Message frequency varies. Message and data rates may apply depending on your carrier and plan. You may opt out of SMS communications at any time by replying STOP to any message. You may opt out of email communications by clicking the unsubscribe link in any email. Opting out of transactional messages (booking confirmations, verification codes) may affect your ability to use certain features of the service.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>6. Data & Privacy</p>
              <p style={{marginBottom:"1rem"}}>We collect and store information you provide including your name, email, phone number, business information, and client data you import. Your data is stored securely using Supabase infrastructure. We do not sell your personal information to third parties. Client data you import (such as from a previous booking platform) is owned by you and can be exported or deleted at any time. We use industry-standard encryption for all sensitive data. Please review our full Privacy Policy at standtallbooking.com/privacy for complete details.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>7. Client Data & Imported Credentials</p>
              <p style={{marginBottom:"1rem"}}>If you choose to provide credentials for a third-party platform for the purpose of data migration assistance, those credentials are encrypted using AES-256 encryption, stored securely in our database, used solely for the purpose of assisting your data migration, and deleted upon your request or upon completion of migration. We will never use third-party credentials for any purpose other than the data migration you explicitly request.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>8. Acceptable Use</p>
              <p style={{marginBottom:"1rem"}}>You agree to use Stand Tall Booking only for lawful purposes. You may not use the platform to send unsolicited communications, collect data without consent, impersonate another person or business, attempt to breach the security of the platform, or resell access to the platform without written authorization. Violation of these terms may result in immediate account suspension.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>9. Limitation of Liability</p>
              <p style={{marginBottom:"1rem"}}>Stand Tall Booking is provided "as is." We make no warranties, express or implied, regarding uptime, accuracy, or fitness for a particular purpose. To the maximum extent permitted by law, our liability for any claim arising from use of the service is limited to the amount you paid in the three months preceding the claim. We are not liable for lost revenue, lost client data, or any indirect, incidental, or consequential damages.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>10. Termination</p>
              <p style={{marginBottom:"1rem"}}>Either party may terminate this agreement at any time. Upon termination, your access to the platform will end at the close of your current billing period. You may export your client data at any time before termination. We reserve the right to terminate accounts that violate these terms without refund.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>11. Governing Law</p>
              <p style={{marginBottom:"1rem"}}>These terms are governed by the laws of the State of Florida. Any disputes shall be resolved in the courts of Pinellas County, Florida.</p>

              <p style={{color:"#D1D5DB", fontWeight:500, marginBottom:"4px"}}>12. Changes to Terms</p>
              <p style={{marginBottom:"0"}}>We may update these terms from time to time. We will notify you by email at least 14 days before any material changes take effect. Continued use of the service after that date constitutes acceptance of the updated terms.</p>
            </div>

            {/* Consent checkboxes */}
            <div style={{display:"flex", flexDirection:"column", gap:"12px", marginBottom:"2rem"}}>
              {[
                { key:"terms", label:"I have read and agree to the Stand Tall Booking Terms of Service and Privacy Policy." },
                { key:"smsEmail", label:"I consent to receive SMS and email communications from Stand Tall Booking including booking notifications, verification codes, and product updates. I understand I can opt out at any time by replying STOP or clicking unsubscribe." },
                { key:"age", label:"I confirm that I am 18 years of age or older and authorized to enter into this agreement on behalf of my business." },
              ].map(c => (
                <label key={c.key} style={{display:"flex", gap:"12px", alignItems:"flex-start", cursor:"pointer"}}>
                  <div onClick={() => setTermsAccepted(t => ({...t, [c.key]: !t[c.key]}))}
                    style={{width:"18px", height:"18px", borderRadius:"3px", border:`2px solid ${termsAccepted[c.key] ? G : "#F2F0EB"}`, background: termsAccepted[c.key] ? G : "transparent", flexShrink:0, marginTop:"1px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s"}}>
                    {termsAccepted[c.key] && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke={BG} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{fontSize:"13px", color:"#F2F0EB", lineHeight:1.6, fontWeight:500}}>{c.label}</span>
                </label>
              ))}
            </div>

            {/* Nav */}
            <div style={{display:"flex", gap:"10px", alignItems:"center"}}>
              {step > 0 && <button onClick={handleBack} style={{background:"transparent", border:`1px solid ${BORDER}`, color:"#D1D5DB", padding:"11px 20px", fontSize:"13px", borderRadius:"2px", cursor:"pointer", fontFamily:"inherit"}}>← Back</button>}
              <button onClick={handleNext} disabled={!Object.values(termsAccepted).every(Boolean)}
                style={{background: Object.values(termsAccepted).every(Boolean) ? G : "#1A1A1A", color: Object.values(termsAccepted).every(Boolean) ? BG : MID, border:"none", padding:"11px 28px", fontSize:"13px", fontWeight:600, letterSpacing:"0.06em", borderRadius:"2px", cursor: Object.values(termsAccepted).every(Boolean) ? "pointer" : "not-allowed", fontFamily:"inherit", transition:"all 0.15s"}}>
                I AGREE — CONTINUE →
              </button>
            </div>
          </div>
        ) : q.type === "plan" ? (
          <div>
            <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>
              {planOptions.map(p => (
                <button key={p.id} onClick={() => { setAnswers(a=>({...a,[q.id]:p.id})); setTimeout(handleNext, 250); }}
                  style={{textAlign:"left", padding:"0", background: val===p.id ? `${p.gold?GOLD:G}12` : p.highlight ? "#141414" : "#111", border: p.highlight ? `2px solid ${G}` : val===p.id ? `1px solid ${p.gold?GOLD:G}` : `1px solid ${BORDER}`, borderRadius:"4px", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", overflow:"hidden"}}>
                  {p.highlight && <div style={{background:G, color:BG, fontSize:"10px", fontWeight:600, letterSpacing:"0.1em", padding:"4px 14px", textTransform:"uppercase", textAlign:"center"}}>Most popular</div>}
                  <div style={{padding:"1.25rem 1.5rem"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.75rem"}}>
                      <div>
                        <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", color:p.gold?GOLD:G, letterSpacing:"0.05em"}}>{p.name}</span>
                        <span style={{fontSize:"12px", color:"#D1D5DB", marginLeft:"10px"}}>{p.tag}</span>
                      </div>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:FG, letterSpacing:"0.02em"}}>{p.price}</span>
                    </div>
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem 1.5rem"}}>
                      <div>
                        {p.pros.map((pr,i) => (
                          <div key={i} style={{display:"flex", gap:"6px", marginBottom:"3px"}}>
                            <span style={{color:p.gold?GOLD:G, fontSize:"11px", flexShrink:0, marginTop:"1px"}}>✓</span>
                            <span style={{fontSize:"11px", color:"#D1D5DB", lineHeight:1.45}}>{pr}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        {p.cons.map((cn,i) => (
                          <div key={i} style={{display:"flex", gap:"6px", marginBottom:"3px"}}>
                            <span style={{color:"#C9CAD0", fontSize:"11px", flexShrink:0, marginTop:"1px"}}>–</span>
                            <span style={{fontSize:"11px", color:"#C9CAD0", lineHeight:1.45}}>{cn}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={()=>setPricingModalOpen(true)} style={{marginTop:"1.25rem", background:"transparent", border:`1px solid ${BORDER}`, color:"#D1D5DB", fontSize:"12px", padding:"9px 18px", borderRadius:"2px", cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.04em", width:"100%"}}>
              See detailed pricing & competitor comparison ↗
            </button>
          </div>
        ) : q.type === "choice" ? (
          <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
            {q.choices.map(c => (
              <button key={c} onClick={() => { setAnswers(a=>({...a,[q.id]:c})); setTimeout(handleNext, 200); }} style={{
                textAlign:"left", padding:"14px 18px", fontSize:"14px",
                background: val===c ? `${G}18` : "#111",
                border: val===c ? `1px solid ${G}` : `1px solid ${BORDER}`,
                color: val===c ? G : FG,
                borderRadius:"4px", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
              }}>{c}</button>
            ))}
          </div>
        ) : q.type === "textarea" ? (
          <textarea value={val} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}
            placeholder={q.placeholder} rows={4}
            style={{width:"100%", padding:"14px 16px", background:"#111", border:`1px solid ${BORDER}`, color:FG, fontSize:"15px", borderRadius:"4px", fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box"}}
          />
        ) : (
          <input type={q.type} value={val} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}
            placeholder={q.placeholder}
            onKeyDown={e=>{ if(e.key==="Enter" && val) handleNext(); }}
            style={{width:"100%", padding:"14px 16px", background:"#111", border:`1px solid ${BORDER}`, color:FG, fontSize:"15px", borderRadius:"4px", fontFamily:"inherit", outline:"none", boxSizing:"border-box"}}
          />
        )}

        {/* Nav buttons */}
        {q.type !== "choice" && q.type !== "plan" && (
          <div style={{display:"flex", gap:"10px", marginTop:"2rem", alignItems:"center"}}>
            {step > 0 && (
              <button onClick={handleBack} style={{background:"transparent", border:`1px solid ${BORDER}`, color:"#D1D5DB", padding:"11px 20px", fontSize:"13px", borderRadius:"2px", cursor:"pointer", fontFamily:"inherit"}}>← Back</button>
            )}
            <button onClick={handleNext} disabled={submitting || !val}
              style={{background:!val?"#1A1A1A":G, color:!val?MID:BG, border:"none", padding:"11px 28px", fontSize:"13px", fontWeight:600, letterSpacing:"0.06em", borderRadius:"2px", cursor:!val?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.15s"}}>
              {submitting ? "Submitting…" : isLast ? "CLAIM MY FREE MONTH →" : "NEXT →"}
            </button>
          </div>
        )}
        {(q.type === "choice" || q.type === "plan") && step > 0 && (
          <button onClick={handleBack} style={{marginTop:"1rem", background:"transparent", border:"none", color:"#D1D5DB", fontSize:"12px", cursor:"pointer", fontFamily:"inherit", padding:0}}>← Back</button>
        )}

        {step === questions.length - 1 && (
          <p style={{fontSize:"12px", color:"#D1D5DB", marginTop:"1.5rem", lineHeight:1.6}}>
            By signing up you agree to our Terms of Service. Month 1 billed at your plan rate. Month 2 credited automatically. Cancel any time.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN TAB ───────────────────────────────────────────────
function LoginTab() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div style={{minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"4rem 2rem"}}>
      <div style={{width:"100%", maxWidth:"380px"}}>
        <p style={{fontSize:"11px", letterSpacing:"0.15em", color:G, fontWeight:500, marginBottom:"0.75rem", textTransform:"uppercase"}}>Subscriber login</p>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"42px", color:FG, margin:"0 0 2.5rem", letterSpacing:"0.02em"}}>Welcome back.</h2>
        <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"
            style={{padding:"13px 16px", background:"#111", border:`1px solid ${BORDER}`, color:FG, fontSize:"14px", borderRadius:"4px", fontFamily:"inherit", outline:"none"}} />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"
            style={{padding:"13px 16px", background:"#111", border:`1px solid ${BORDER}`, color:FG, fontSize:"14px", borderRadius:"4px", fontFamily:"inherit", outline:"none"}} />
          <button
            onClick={() => window.location.href = "/barber-login"}
            style={{background:G, color:BG, border:"none", padding:"13px", fontSize:"13px", fontWeight:600, letterSpacing:"0.08em", borderRadius:"2px", cursor:"pointer", marginTop:"4px"}}>
            LOG IN →
          </button>
        </div>
        <div style={{marginTop:"1.5rem", display:"flex", justifyContent:"space-between"}}>
          <a href="/forgot-password" style={{fontSize:"12px", color:"#D1D5DB", textDecoration:"none"}}>Forgot password?</a>
          <button onClick={() => {}} style={{background:"none", border:"none", fontSize:"12px", color:G, cursor:"pointer", padding:0}}>Sign up instead</button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function HomePage() {
  const [tab, setTab] = useState("Home");

  return (
    <div style={{minHeight:"100vh", background:BG, color:FG, fontFamily:"'Inter', system-ui, sans-serif"}}>
      <Nav tab={tab} setTab={setTab} />
      {tab === "Home"       && <HomeTab setTab={setTab} />}
      {tab === "Pricing"    && <PricingTab setTab={setTab} />}
      {tab === "Join Today" && <JoinTab />}
      {tab === "Login"      && <LoginTab />}
      <div style={{borderTop:`1px solid ${BORDER}`, padding:"1.5rem 2rem", textAlign:"center"}}>
        <span style={{fontSize:"12px", color:"#2D2D2D"}}>© 2026 Stand Tall Booking · standtallbooking.com</span>
      </div>
    </div>
  );
}
