import { useState } from "react";
import { Megaphone, Tag, History, Settings, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TABS = [
  { id: "campaigns",   label: "Campaigns",   icon: Megaphone },
  { id: "promo-codes", label: "Promo Codes",  icon: Tag },
  { id: "history",     label: "History",      icon: History },
  { id: "settings",    label: "Settings",     icon: Settings },
];

function EmptyTab({ icon: Icon, title, description, phase }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-sm mb-6 text-sm">{description}</p>
      <Badge variant="secondary">Coming in {phase}</Badge>
    </div>
  );
}

export default function Marketing() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#B0BFA4]/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[#8B9A7E]" />
          </div>
          <h1 className="text-2xl font-bold">Marketing</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Campaigns, automations, and promo codes for Stand Tall Barbershop
        </p>
      </div>

      {/* Resend domain warning — persistent until domain is verified */}
      <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
        <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <span className="font-semibold text-amber-800 dark:text-amber-200">Email domain not verified. </span>
          Marketing emails will send from{" "}
          <code className="font-mono text-xs">onboarding@resend.dev</code> until a custom domain is
          verified in Resend. Complete domain verification before sending bulk campaigns to avoid
          spam filtering.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-muted/40 p-1 rounded-xl w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="rounded-2xl border border-border bg-card">
        {activeTab === "campaigns" && (
          <EmptyTab
            icon={Megaphone}
            title="Campaigns"
            description="Send one-time email blasts or set up automated campaigns like win-back and birthday messages."
            phase="Phase 2"
          />
        )}
        {activeTab === "promo-codes" && (
          <EmptyTab
            icon={Tag}
            title="Promo Codes"
            description="Create fixed or percentage discount codes. Apply at checkout or let clients enter them on the booking page."
            phase="Phase 5"
          />
        )}
        {activeTab === "history" && (
          <EmptyTab
            icon={History}
            title="Send History"
            description="View all past campaign sends with open rates, click rates, and per-recipient delivery status."
            phase="Phase 3"
          />
        )}
        {activeTab === "settings" && (
          <EmptyTab
            icon={Settings}
            title="Marketing Settings"
            description="Configure your Google and Yelp review links, set automation timing, and manage email sender preferences."
            phase="Phase 4"
          />
        )}
      </div>
    </div>
  );
}
