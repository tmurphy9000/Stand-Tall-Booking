import { X, Calendar, DollarSign, Users, Package, Megaphone, BarChart3, Shield, Tablet, Bell, CalendarOff, Mail, Clock, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

const G = "#8B9A7E";
const BG = "#0D0D0D";
const BORDER = "rgba(255,255,255,0.08)";
const FG = "#FAFAF8";
const MID = "#9CA3AF";

const FEATURES = [
  {
    name: "Calendar",
    icon: Calendar,
    desc: "Your shop's central hub. View all bookings by day or week, manage your team's schedules, and create bookings manually for walk-ins or phone calls.",
  },
  {
    name: "Quick Checkout",
    icon: DollarSign,
    desc: "Process a client at the end of their visit — collect payment, apply tips, add product sales, and close out the appointment in a few taps.",
  },
  {
    name: "Clients",
    icon: Users,
    desc: "A full client directory with visit history, contact info, and notes. Search, filter, and import your existing client list from other platforms.",
  },
  {
    name: "Inventory",
    icon: Package,
    desc: "Track your product stock, log adjustments, and keep tabs on what's selling. Connect product sales to checkout for automatic inventory updates.",
  },
  {
    name: "Marketing",
    icon: Megaphone,
    desc: "Send email campaigns to your client list, set up automated messages (welcome emails, rebooking reminders, win-back campaigns), and manage promo codes.",
  },
  {
    name: "Payroll",
    icon: CreditCard,
    desc: "Run payroll reports for your team based on their commissions and hours. Connect Gusto for automated payroll processing.",
  },
  {
    name: "Transactions",
    icon: DollarSign,
    desc: "A full record of every payment, refund, and cash transaction at your shop. Filter by date, barber, or payment type.",
  },
  {
    name: "Personal Report",
    icon: BarChart3,
    desc: "Each barber's individual performance summary — their bookings, revenue, tips, and product sales for any time period.",
  },
  {
    name: "Shop Reporting",
    icon: BarChart3,
    desc: "Shop-wide analytics — total revenue, booking volume, top services, and team performance at a glance.",
  },
  {
    name: "Access Levels",
    icon: Shield,
    desc: "Control exactly what each role can see and do. Create custom permission levels for managers, senior barbers, or service providers.",
  },
  {
    name: "Kiosk Mode",
    icon: Tablet,
    desc: "Turn any tablet into a check-in station for your waiting area. Clients check themselves in and join the queue without staff involvement.",
  },
  {
    name: "Alerts",
    icon: Bell,
    desc: "Stay on top of new bookings, cancellations, and important shop activity without having to check the calendar constantly.",
  },
  {
    name: "Call-Off / Time-Off",
    icon: CalendarOff,
    desc: "Barbers can request time off and mark themselves unavailable. Requests flow to the owner for approval and automatically block their calendar.",
  },
  {
    name: "Notifications",
    icon: Mail,
    desc: "Customize how and when clients receive booking confirmations, reminders, and follow-ups via email and SMS.",
  },
];

export default function FeatureOverview({ onClose }) {
  const navigate = useNavigate();

  function handleDone() {
    onClose();
    navigate("/Calendar");
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: "16px",
        width: "100%",
        maxWidth: "920px",
        maxHeight: "90vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem 2rem 1.25rem",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: G, fontWeight: 600, textTransform: "uppercase", margin: "0 0 0.5rem" }}>
              You're all set ✓
            </p>
            <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, color: FG, margin: "0 0 0.4rem", lineHeight: 1.2 }}>
              Here's everything Stand Tall Booking can do.
            </h2>
            <p style={{ fontSize: "14px", color: MID, margin: 0 }}>
              You've got your shop set up — here's a quick look at the tools available to you.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: MID, padding: "4px", marginLeft: "1rem", flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feature grid */}
        <div style={{ overflowY: "auto", padding: "1.5rem 2rem", flex: 1 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "12px",
          }}>
            {FEATURES.map(({ name, icon: Icon, desc }) => (
              <div key={name} style={{
                background: "#111",
                border: `1px solid ${BORDER}`,
                borderRadius: "10px",
                padding: "1rem 1.1rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
                  <div style={{
                    width: "30px", height: "30px", borderRadius: "7px",
                    background: "rgba(139,154,126,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon size={15} style={{ color: G }} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: FG }}>{name}</span>
                </div>
                <p style={{ fontSize: "12px", color: MID, lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "1.25rem 2rem",
          borderTop: `1px solid ${BORDER}`,
          flexShrink: 0,
          display: "flex", justifyContent: "flex-end",
        }}>
          <button
            onClick={handleDone}
            style={{
              background: G, color: BG, border: "none",
              padding: "12px 28px", fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.06em", borderRadius: "4px", cursor: "pointer",
            }}
          >
            Got it, take me to my dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
