const G = "#8B9A7E";
const GOLD = "#C9A84C";
const BG = "#0D0D0D";
const FG = "#F2F0EB";
const MID = "#6B7280";
const BORDER = "#1C1C1C";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: `When you create a Stand Tall Booking account, we collect information you provide directly, such as your name, email address, phone number, and business details. When your clients book appointments, we collect their name, phone number, and email address for the purpose of managing appointments. If you choose to import data from a previous booking platform, we may collect that data along with any credentials you provide for migration purposes.`,
  },
  {
    title: "2. How We Use Your Information",
    body: `We use the information we collect to provide and improve the Stand Tall Booking platform, including appointment scheduling, client management, payroll, and reporting features. We use client contact information to send appointment confirmations, reminders, and updates via SMS and email on your behalf. We may use your account information to send you product updates, billing notifications, and support communications.`,
  },
  {
    title: "3. SMS & Email Communications",
    body: `Stand Tall Booking sends SMS and email messages related to appointment booking, confirmations, reminders, and account notifications. By using the platform or booking an appointment, you consent to receive these communications. Message and data rates may apply. Clients may opt out of SMS reminders at any time by replying STOP to any message, and may opt out of email by clicking the unsubscribe link included in every email. Opting out of transactional messages may affect the ability to receive appointment reminders.`,
  },
  {
    title: "4. We Do Not Sell Your Data",
    body: `We do not sell, rent, or trade your personal information or your clients' personal information to third parties for marketing purposes. Information is only shared with service providers (such as payment processors, SMS/email delivery providers, and cloud infrastructure providers) to the extent necessary to operate the platform.`,
  },
  {
    title: "5. Data Storage & Security",
    body: `Your data is stored using Supabase, a secure cloud database infrastructure provider, with industry-standard encryption in transit and at rest. Access to your account data is restricted to authenticated users associated with your business. We use AES-256 encryption for any sensitive credentials, such as third-party platform logins provided for data migration assistance.`,
  },
  {
    title: "6. Client Data You Import or Manage",
    body: `Any client data you import into Stand Tall Booking (such as names, contact information, appointment history, or notes from a previous platform) remains your property. You are responsible for ensuring you have the right to collect and use this data, including obtaining any necessary consent from your clients for SMS and email communications. You may export or delete your client data at any time from within the platform.`,
  },
  {
    title: "7. Data Retention & Deletion",
    body: `We retain your account and client data for as long as your account is active. If you cancel your subscription, your data is retained for a reasonable period in case you wish to reactivate, after which it may be permanently deleted. You may request deletion of your account and associated data at any time by contacting us, and we will complete the deletion within 30 days.`,
  },
  {
    title: "8. Cookies & Analytics",
    body: `We may use cookies and similar technologies to keep you logged in, remember your preferences, and understand how the platform is used so we can improve it. We do not use third-party advertising trackers.`,
  },
  {
    title: "9. Children's Privacy",
    body: `Stand Tall Booking is intended for use by business owners, staff, and their adult clients. We do not knowingly collect personal information from children under 13. If a parent or guardian books an appointment on behalf of a minor, only the information necessary to manage that appointment is collected.`,
  },
  {
    title: "10. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. We will notify account holders by email of any material changes at least 14 days before they take effect. Continued use of the platform after that date constitutes acceptance of the updated policy.`,
  },
  {
    title: "11. Contact Us",
    body: `If you have questions about this Privacy Policy, how your data is handled, or wish to request deletion of your data, contact us at Tanner@standtallbarbering.com or through standtallbooking.com.`,
  },
];

import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <div style={{minHeight:"100vh", background:BG, color:FG, fontFamily:"'Inter', system-ui, sans-serif"}}>
      <Helmet>
        <title>Privacy Policy — Stand Tall Booking</title>
        <meta name="description" content="Read the Stand Tall Booking Privacy Policy. Learn how we collect, use, and protect information for barbershop owners and their clients." />
        <meta property="og:title" content="Privacy Policy — Stand Tall Booking" />
        <meta property="og:description" content="Read the Stand Tall Booking Privacy Policy. Learn how we collect, use, and protect information for barbershop owners and their clients." />
        <meta property="og:url" content="https://standtallbooking.com/privacy" />
        <link rel="canonical" href="https://standtallbooking.com/privacy" />
      </Helmet>

      <nav style={{position:"sticky", top:0, zIndex:50, background:BG, borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 2.5rem", height:"60px"}}>
        <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px", letterSpacing:"0.08em", color:G}}>STAND TALL BOOKING</span>
        <a href="/" style={{fontSize:"12px", fontWeight:500, letterSpacing:"0.06em", color:MID, textDecoration:"none"}}>← BACK TO HOME</a>
      </nav>

      <div style={{maxWidth:"720px", margin:"0 auto", padding:"4rem 2rem"}}>
        <p style={{fontSize:"11px", letterSpacing:"0.15em", color:G, fontWeight:500, marginBottom:"1rem", textTransform:"uppercase"}}>Legal</p>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(36px,6vw,64px)", letterSpacing:"0.02em", lineHeight:1, margin:"0 0 0.75rem", color:FG}}>Privacy Policy</h1>
        <p style={{fontSize:"13px", color:MID, marginBottom:"3rem"}}>Last updated: June 2026</p>

        <p style={{fontSize:"14px", color:"#D1D5DB", lineHeight:1.75, marginBottom:"2.5rem"}}>
          This Privacy Policy explains how Stand Tall Booking collects, uses, and protects information for businesses that use our platform and the clients who book appointments through it.
        </p>

        {SECTIONS.map(s => (
          <div key={s.title} style={{marginBottom:"2rem"}}>
            <h2 style={{fontSize:"15px", fontWeight:700, color:FG, marginBottom:"0.5rem"}}>{s.title}</h2>
            <p style={{fontSize:"14px", color:"#D1D5DB", lineHeight:1.75}}>{s.body}</p>
          </div>
        ))}

        <div style={{borderTop:`1px solid ${BORDER}`, marginTop:"3rem", paddingTop:"2rem"}}>
          <p style={{fontSize:"13px", color:MID}}>
            Questions about this policy? Contact us at{" "}
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
