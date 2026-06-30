import { Helmet } from "react-helmet-async";
import { Nav, PricingTab } from "./HomePage";

const BG = "#0D0D0D";
const FG = "#F2F0EB";
const BORDER = "#1C1C1C";

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", background: BG, color: FG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Helmet>
        <title>Pricing — Stand Tall Booking</title>
        <meta name="description" content="Simple, flat-rate pricing for barbershops. Basic from $29/mo, Pro from $79/mo, Elite from $149/mo per location. SMS & email reminders included on every plan. No per-barber fees. No contracts." />
        <meta property="og:title" content="Pricing — Stand Tall Booking" />
        <meta property="og:description" content="Flat-rate barbershop scheduling software starting at $29/mo. SMS & email reminders included. No per-barber fees. No contracts. Cancel any time." />
        <meta property="og:url" content="https://standtallbooking.com/pricing" />
        <link rel="canonical" href="https://standtallbooking.com/pricing" />
      </Helmet>
      <Nav />
      <PricingTab />
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "1.5rem 2rem", textAlign: "center" }}>
        <span style={{ fontSize: "12px", color: "#2D2D2D" }}>© 2026 Stand Tall Booking · standtallbooking.com</span>
      </div>
    </div>
  );
}
