const G = "#8B9A7E";
const GOLD = "#C9A84C";
const BG = "#0D0D0D";
const FG = "#F2F0EB";
const MID = "#6B7280";
const BORDER = "#1C1C1C";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By creating an account with Stand Tall Booking ("we," "us," or "our"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you may not use our service. These terms apply to all users of the platform, including barbershop owners, managers, barbers, and clients.`,
  },
  {
    title: "2. Description of Service",
    body: `Stand Tall Booking provides a cloud-based barbershop management and booking platform including online appointment scheduling, client management, team management, payroll tracking, and AI-powered tools. We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.`,
  },
  {
    title: "3. Subscription & Billing",
    body: `Your subscription begins on the date you create your account. You will be billed monthly at the rate of your chosen plan. Your first month is billed at full price. As a promotional offer, your second month will be credited automatically — no action required. Subscriptions automatically renew each month unless cancelled. You may cancel at any time and will retain access through the end of your current billing period. No refunds are issued for partial months. Prices are subject to change with 30 days notice.`,
  },
  {
    title: "4. Add-On Services",
    body: `Certain features including Payroll and the AI Voice Agent are available as paid add-ons billed in addition to your base subscription. Payroll fees are passed through at cost. The AI Voice Agent add-on is $99.99/month per account. Add-ons may be added or removed at any time and changes take effect on the next billing cycle.`,
  },
  {
    title: "5. SMS & Email Communications",
    body: `Transactional emails (booking confirmations, reminders, and updates) may be sent to the email address you provide. During the booking process, you may separately opt in to receive SMS appointment reminders. Opting in to SMS is not required to book an appointment. If you choose to receive SMS reminders: messages are sent via toll-free number; message frequency varies; standard message and data rates may apply depending on your carrier and plan; and you may opt out at any time by replying STOP to any message. Authentication and verification codes are transactional and are sent regardless of SMS reminder opt-in status.`,
  },
  {
    title: "6. Data & Privacy",
    body: `We collect and store information you provide including your name, email, phone number, business information, and client data you import. Your data is stored securely using Supabase infrastructure. We do not sell your personal information to third parties. Client data you import (such as from a previous booking platform) is owned by you and can be exported or deleted at any time. We use industry-standard encryption for all sensitive data. Please review our full Privacy Policy at standtallbooking.com/privacy for complete details.`,
  },
  {
    title: "7. Client Data & Imported Credentials",
    body: `If you choose to provide credentials for a third-party platform for the purpose of data migration assistance, those credentials are encrypted using AES-256 encryption, stored securely in our database, used solely for the purpose of assisting your data migration, and deleted upon your request or upon completion of migration. We will never use third-party credentials for any purpose other than the data migration you explicitly request.`,
  },
  {
    title: "8. Acceptable Use",
    body: `You agree to use Stand Tall Booking only for lawful purposes. You may not use the platform to send unsolicited communications, collect data without consent, impersonate another person or business, attempt to breach the security of the platform, or resell access to the platform without written authorization. Violation of these terms may result in immediate account suspension.`,
  },
  {
    title: "9. Limitation of Liability",
    body: `Stand Tall Booking is provided "as is." We make no warranties, express or implied, regarding uptime, accuracy, or fitness for a particular purpose. To the maximum extent permitted by law, our liability for any claim arising from use of the service is limited to the amount you paid in the three months preceding the claim. We are not liable for lost revenue, lost client data, or any indirect, incidental, or consequential damages.`,
  },
  {
    title: "10. Termination",
    body: `Either party may terminate this agreement at any time. Upon termination, your access to the platform will end at the close of your current billing period. You may export your client data at any time before termination. We reserve the right to terminate accounts that violate these terms without refund.`,
  },
  {
    title: "11. Governing Law",
    body: `These terms are governed by the laws of the State of Florida. Any disputes shall be resolved in the courts of Pinellas County, Florida.`,
  },
  {
    title: "12. Changes to Terms",
    body: `We may update these terms from time to time. We will notify you by email at least 14 days before any material changes take effect. Continued use of the service after that date constitutes acceptance of the updated terms.`,
  },
];

import { Helmet } from "react-helmet-async";

export default function TermsOfService() {
  return (
    <div style={{minHeight:"100vh", background:BG, color:FG, fontFamily:"'Inter', system-ui, sans-serif"}}>
      <Helmet>
        <title>Terms of Service — Stand Tall Booking</title>
        <meta name="description" content="Read the Stand Tall Booking Terms of Service, including subscription billing, communications consent, and acceptable use." />
        <meta property="og:title" content="Terms of Service — Stand Tall Booking" />
        <meta property="og:description" content="Read the Stand Tall Booking Terms of Service, including subscription billing, communications consent, and acceptable use." />
        <meta property="og:url" content="https://standtallbooking.com/terms" />
        <link rel="canonical" href="https://standtallbooking.com/terms" />
      </Helmet>

      <nav style={{position:"sticky", top:0, zIndex:50, background:BG, borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 2.5rem", height:"60px"}}>
        <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.08em", color:G}}>STAND TALL BOOKING</span>
        <a href="/" style={{fontSize:"12px", fontWeight:500, letterSpacing:"0.06em", color:MID, textDecoration:"none"}}>← BACK TO HOME</a>
      </nav>

      <div style={{maxWidth:"720px", margin:"0 auto", padding:"4rem 2rem"}}>
        <p style={{fontSize:"11px", letterSpacing:"0.15em", color:G, fontWeight:500, marginBottom:"1rem", textTransform:"uppercase"}}>Legal</p>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(36px,6vw,64px)", letterSpacing:"0.02em", lineHeight:1, margin:"0 0 0.75rem", color:FG}}>Terms of Service</h1>
        <p style={{fontSize:"13px", color:MID, marginBottom:"3rem"}}>Last updated: June 2026</p>

        <p style={{fontSize:"14px", color:"#D1D5DB", lineHeight:1.75, marginBottom:"2.5rem"}}>
          Stand Tall Booking — Terms of Service & Communications Consent. Please read these terms carefully before creating your account.
        </p>

        {SECTIONS.map(s => (
          <div key={s.title} style={{marginBottom:"2rem"}}>
            <h2 style={{fontSize:"15px", fontWeight:700, color:FG, marginBottom:"0.5rem"}}>{s.title}</h2>
            <p style={{fontSize:"14px", color:"#D1D5DB", lineHeight:1.75}}>{s.body}</p>
          </div>
        ))}

        <div style={{borderTop:`1px solid ${BORDER}`, marginTop:"3rem", paddingTop:"2rem"}}>
          <p style={{fontSize:"13px", color:MID}}>
            Questions about these terms? Contact us at{" "}
            <a href="mailto:Tanner@standtallbarbering.com" style={{color:GOLD, textDecoration:"none"}}>Tanner@standtallbarbering.com</a>.
          </p>
        </div>
      </div>

      <div style={{borderTop:`1px solid ${BORDER}`, padding:"1.5rem 2rem", textAlign:"center"}}>
        <span style={{fontSize:"12px", color:"#2D2D2D"}}>© 2026 Stand Tall Booking · standtallbooking.com</span>
      </div>
    </div>
  );
}
