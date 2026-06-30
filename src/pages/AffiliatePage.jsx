import { Helmet } from "react-helmet-async";
import { Nav, AffiliateTab } from "./HomePage";

const BG = "#0D0D0D";
const FG = "#F2F0EB";
const BORDER = "#1C1C1C";

export default function AffiliatePage() {
  return (
    <div style={{ minHeight: "100vh", background: BG, color: FG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Helmet>
        <title>Affiliate Program — Stand Tall Booking</title>
        <meta name="description" content="Refer barbershops to Stand Tall Booking and earn up to 50% commission on their monthly subscription for 3 months. No cap. Apply to join our affiliate program." />
        <meta property="og:title" content="Affiliate Program — Stand Tall Booking" />
        <meta property="og:description" content="Earn up to 50% commission referring barbershops to Stand Tall Booking. Commission lasts 3 months per referral. No cap, no gimmicks. Apply today." />
        <meta property="og:url" content="https://standtallbooking.com/affiliates" />
        <link rel="canonical" href="https://standtallbooking.com/affiliates" />
      </Helmet>
      <Nav />
      <AffiliateTab />
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "1.5rem 2rem", textAlign: "center" }}>
        <span style={{ fontSize: "12px", color: "#2D2D2D" }}>© 2026 Stand Tall Booking · standtallbooking.com</span>
      </div>
    </div>
  );
}
