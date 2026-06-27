import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Search, Loader2, Crown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createPageUrl } from "../utils";
import { usePermissions } from "../components/permissions/usePermissions";

// Placeholder data until Stripe is connected.
const PLACEHOLDER_ACCOUNTS = [
  { id: 1, shop_name: "Sharp Edge Barbershop", owner_name: "Marcus Reed", plan: "Pro", joined_date: "2026-01-12", status: "active" },
  { id: 2, shop_name: "Fade Factory", owner_name: "Devon Coleman", plan: "Starter", joined_date: "2026-02-03", status: "active" },
  { id: 3, shop_name: "The Clean Cut Co.", owner_name: "Priya Nair", plan: "Free", joined_date: "2026-02-20", status: "active" },
  { id: 4, shop_name: "Gentlemen's Quarters", owner_name: "Owen Bennett", plan: "Pro", joined_date: "2026-03-08", status: "active" },
  { id: 5, shop_name: "Royal Trim Studio", owner_name: "Tasha Brooks", plan: "Starter", joined_date: "2026-03-22", status: "active" },
  { id: 6, shop_name: "Lucky Scissors", owner_name: "Jamal Price", plan: "Starter", joined_date: "2026-01-30", status: "cancelled" },
  { id: 7, shop_name: "Velvet Razor Lounge", owner_name: "Carlos Mendoza", plan: "Pro", joined_date: "2025-12-15", status: "inactive" },
  { id: 8, shop_name: "Modern Man Barbers", owner_name: "Aisha Thompson", plan: "Free", joined_date: "2026-04-02", status: "cancelled" },
];

const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const PLAN_BADGE_STYLES = {
  Free: "bg-muted text-muted-foreground border-border",
  Starter: "bg-blue-50 text-blue-700 border-blue-200",
  Pro: "bg-[#8B9A7E]/10 text-[#6B7A5E] border-[#8B9A7E]/30",
};

function PlanBadge({ plan }) {
  return <Badge variant="outline" className={PLAN_BADGE_STYLES[plan] || ""}>{plan}</Badge>;
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-green-50 text-green-700 border-green-200",
    inactive: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
}

function ActiveSubscriptionsTab() {
  const active = PLACEHOLDER_ACCOUNTS.filter(a => a.status === "active");
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop Name</TableHead>
              <TableHead>Owner Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map(account => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.shop_name}</TableCell>
                <TableCell>{account.owner_name}</TableCell>
                <TableCell><PlanBadge plan={account.plan} /></TableCell>
                <TableCell>{account.joined_date}</TableCell>
                <TableCell><StatusBadge status={account.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InactiveTab() {
  const inactive = PLACEHOLDER_ACCOUNTS.filter(a => a.status !== "active");
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop Name</TableHead>
              <TableHead>Owner Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inactive.map(account => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.shop_name}</TableCell>
                <TableCell>{account.owner_name}</TableCell>
                <TableCell><PlanBadge plan={account.plan} /></TableCell>
                <TableCell>{account.joined_date}</TableCell>
                <TableCell><StatusBadge status={account.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AllSignupsTab() {
  const [range, setRange] = useState("all");

  const filtered = useMemo(() => {
    if (range === "all") return PLACEHOLDER_ACCOUNTS;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(range, 10));
    return PLACEHOLDER_ACCOUNTS.filter(a => new Date(a.joined_date) >= cutoff);
  }, [range]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Signed up:</span>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Owner Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Signup Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(account => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.shop_name}</TableCell>
                  <TableCell>{account.owner_name}</TableCell>
                  <TableCell><PlanBadge plan={account.plan} /></TableCell>
                  <TableCell>{account.joined_date}</TableCell>
                  <TableCell><StatusBadge status={account.status} /></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No signups in this range
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountActionsTab() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.trim().toLowerCase();
    return PLACEHOLDER_ACCOUNTS.filter(a => a.shop_name.toLowerCase().includes(term));
  }, [search]);

  const handleAction = (label) => {
    toast.info("Coming soon - requires Stripe integration", { description: label });
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search for a shop by name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
          className="pl-10"
        />
      </div>

      {search.trim() && !selected && (
        <div className="grid gap-2">
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">No shops found.</p>
          )}
          {results.map(account => (
            <Card
              key={account.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(account)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{account.shop_name}</p>
                  <p className="text-xs text-muted-foreground">{account.owner_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PlanBadge plan={account.plan} />
                  <StatusBadge status={account.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{selected.shop_name}</p>
                <p className="text-xs text-muted-foreground">{selected.owner_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <PlanBadge plan={selected.plan} />
                <StatusBadge status={selected.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleAction("Add free month")}>
                Add free month
              </Button>
              <Button variant="outline" onClick={() => handleAction("Unlock feature")}>
                Unlock feature
              </Button>
              <Button variant="outline" onClick={() => handleAction("Suspend account")}>
                Suspend account
              </Button>
              <Button variant="outline" onClick={() => handleAction("Reactivate account")}>
                Reactivate account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const STEP_LABELS = {
  shop_type: "Shop type",
  barbers_current: "# barbers (current)",
  barbers_capacity: "# barbers (capacity)",
  model: "Pay structure",
  current_software: "Current software",
  biggest_complaint: "Pain points",
  biggest_like: "What they like",
  plan: "Plan selection",
  name: "Name",
  terms: "Terms",
  email: "Email",
  phone: "Phone",
  questionnaire_complete: "All done (pre-checkout)",
};

const DROPOFF_RANGES = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "all", label: "All time" },
];

function timeAgo(ts) {
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RoleBadge({ level }) {
  if (level === "owner") {
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
        <Crown className="w-3 h-3" /> Owner
      </Badge>
    );
  }
  return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Superadmin</Badge>;
}

function SuperadminsTab({ isOwnerTier }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [admins, setAdmins] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  // { password: string, label: string } — shown once, never persisted; null when dismissed
  const [tempPasswordData, setTempPasswordData] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  // { type: 'remove'|'promote', barber } | null
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadList = async () => {
    setLoadingList(true);
    const { data } = await supabase.functions.invoke("inviteSuperadmin", {
      body: { action: "list" },
    });
    setAdmins(data?.admins ?? []);
    setLoadingList(false);
  };

  useEffect(() => { loadList(); }, []);

  const extractFnError = async (fnError) => {
    if (fnError?.context instanceof Response) {
      try {
        const body = await fnError.context.clone().json();
        if (body?.error) return body.error;
      } catch { /* fall through */ }
    }
    return fnError?.message || "Unknown error";
  };

  const handleInvite = async () => {
    setError("");
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setSubmitting(true);
    const capturedEmail = email.trim();
    const { data, error: fnError } = await supabase.functions.invoke("inviteSuperadmin", {
      body: { action: "invite", name: name.trim(), email: capturedEmail },
    });
    setSubmitting(false);
    if (fnError || data?.error) {
      setError(data?.error || await extractFnError(fnError));
      return;
    }
    if (data?.admins) setAdmins(data.admins);
    setName("");
    setEmail("");
    setTempPasswordData({ password: data.temp_password, label: `for ${capturedEmail}` });
  };

  const handleReset = async (barber) => {
    setError("");
    setResettingId(barber.id);
    const { data, error: fnError } = await supabase.functions.invoke("inviteSuperadmin", {
      body: { action: "reset", barber_id: barber.id },
    });
    setResettingId(null);
    if (fnError || data?.error) {
      setError(data?.error || await extractFnError(fnError));
      return;
    }
    setTempPasswordData({ password: data.temp_password, label: `for ${barber.email}` });
  };

  const handleRemove = async (barber) => {
    setActionLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke("inviteSuperadmin", {
      body: { action: "delete", barber_id: barber.id },
    });
    setActionLoading(false);
    setConfirmAction(null);
    if (fnError || data?.error) {
      setError(data?.error || await extractFnError(fnError));
      return;
    }
    if (data?.admins) setAdmins(data.admins);
    toast.success(`${barber.name}'s admin access has been removed.`);
  };

  const handlePromote = async (barber) => {
    setActionLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke("inviteSuperadmin", {
      body: { action: "promote", barber_id: barber.id },
    });
    setActionLoading(false);
    setConfirmAction(null);
    if (fnError || data?.error) {
      setError(data?.error || await extractFnError(fnError));
      return;
    }
    if (data?.admins) setAdmins(data.admins);
    toast.success(`${barber.name} has been promoted to Owner.`);
  };

  const handleDemote = async (barber) => {
    setActionLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke("inviteSuperadmin", {
      body: { action: "demote", barber_id: barber.id },
    });
    setActionLoading(false);
    setConfirmAction(null);
    if (fnError || data?.error) {
      setError(data?.error || await extractFnError(fnError));
      return;
    }
    if (data?.admins) setAdmins(data.admins);
    toast.success(`${barber.name} has been demoted to Superadmin.`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Current platform admins list */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Platform Admins</h3>
          {loadingList ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin accounts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  {isOwnerTier && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell className="text-sm">{s.email}</TableCell>
                    <TableCell><RoleBadge level={s.permission_level} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    {isOwnerTier && (
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2"
                            disabled={resettingId === s.id || !!confirmAction}
                            onClick={() => handleReset(s)}
                          >
                            {resettingId === s.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : "Reset pwd"}
                          </Button>
                          {s.permission_level !== "owner" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                              disabled={!!confirmAction}
                              onClick={() => setConfirmAction({ type: "promote", barber: s })}
                            >
                              Promote
                            </Button>
                          )}
                          {s.permission_level === "owner" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                              disabled={!!confirmAction}
                              onClick={() => setConfirmAction({ type: "demote", barber: s })}
                            >
                              Demote
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={!!confirmAction}
                            onClick={() => setConfirmAction({ type: "remove", barber: s })}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation card — shown when Remove, Demote, or Promote is clicked */}
      {confirmAction && (
        <Card className={
          confirmAction.type === "remove" ? "border-red-200 bg-red-50"
          : confirmAction.type === "demote" ? "border-amber-200 bg-amber-50"
          : "border-purple-200 bg-purple-50"
        }>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">
              {confirmAction.type === "remove"
                ? `Remove ${confirmAction.barber.name}'s admin access? Their login will be disabled immediately.`
                : confirmAction.type === "demote"
                ? `Demote ${confirmAction.barber.name} from Owner to Superadmin? They will lose access to the invite form, Remove/Promote/Demote buttons, and Activity Log.`
                : `Promote ${confirmAction.barber.name} to Owner? They'll have full platform control, including the ability to remove other admins.`}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={actionLoading}
                className={
                  confirmAction.type === "remove"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : confirmAction.type === "demote"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }
                onClick={() => {
                  if (confirmAction.type === "remove") handleRemove(confirmAction.barber);
                  else if (confirmAction.type === "demote") handleDemote(confirmAction.barber);
                  else handlePromote(confirmAction.barber);
                }}
              >
                {actionLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : confirmAction.type === "remove" ? (
                  "Yes, remove access"
                ) : confirmAction.type === "demote" ? (
                  "Yes, demote to Superadmin"
                ) : (
                  "Yes, promote to Owner"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Add New Superadmin / one-time temp password display (owner-only) */}
      {isOwnerTier && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {tempPasswordData ? (
              /* Shown once — dismissed on "Done", never retrievable after that */
              <>
                <div>
                  <h3 className="text-sm font-semibold">Temporary Password</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Account {tempPasswordData.label}. Copy it now — it won't be shown again.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted border border-border rounded px-3 py-2.5 text-sm font-mono tracking-wider select-all">
                    {tempPasswordData.password}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPasswordData.password);
                      toast.success("Copied to clipboard");
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Send via phone or a secure channel — do not email this password.
                </p>
                <Button className="w-full" onClick={() => setTempPasswordData(null)}>
                  Done — I've copied it
                </Button>
              </>
            ) : (
              /* Invite form */
              <>
                <div>
                  <h3 className="text-sm font-semibold">Add New Superadmin</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Creates an account with a temporary password you'll share out-of-band. No email is sent.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Full name</label>
                    <Input
                      value={name}
                      onChange={e => { setName(e.target.value); setError(""); }}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Email address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      placeholder="jane@example.com"
                      onKeyDown={e => { if (e.key === "Enter") handleInvite(); }}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleInvite}
                  disabled={submitting || !name.trim() || !email.trim()}
                >
                  {submitting ? "Creating account…" : "Create account"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const ACTION_LABELS = {
  superadmin_created: "Account created",
  password_reset_triggered: "Password reset",
  superadmin_deleted: "Access removed",
  promoted_to_owner: "Promoted to Owner",
  demoted_to_superadmin: "Demoted to Superadmin",
  recurring_block_series_deleted: "Recurring blocks deleted",
};

const LOG_DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const LOG_TYPE_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "superadmin_created", label: "Account created" },
  { value: "password_reset_triggered", label: "Password reset" },
  { value: "superadmin_deleted", label: "Access removed" },
  { value: "promoted_to_owner", label: "Promoted to Owner" },
  { value: "demoted_to_superadmin", label: "Demoted to Superadmin" },
  { value: "recurring_block_series_deleted", label: "Recurring blocks deleted" },
];

function ActivityLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setLogs(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let items = logs;
    if (typeFilter !== "all") items = items.filter(l => l.action_type === typeFilter);
    if (range !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(range, 10));
      items = items.filter(l => new Date(l.created_at) >= cutoff);
    }
    return items;
  }, [logs, range, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOG_DATE_RANGES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOG_TYPE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loading && (
          <span className="text-sm text-muted-foreground ml-1">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No activity in this period
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(l.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{l.actor_name}</div>
                    <div className="text-xs text-muted-foreground">{l.actor_email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ACTION_LABELS[l.action_type] ?? l.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.target_label ?? l.target_id ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DropOffsTab() {
  const [range, setRange] = useState("7");
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("signup_attempts")
      .select("*")
      .eq("completed", false)
      .order("last_updated_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setAttempts(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (range === "all") return attempts;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(range, 10));
    return attempts.filter(a => new Date(a.last_updated_at) >= cutoff);
  }, [attempts, range]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Activity in:</span>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DROPOFF_RANGES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loading && (
          <span className="text-sm text-muted-foreground ml-2">
            {filtered.length} incomplete {filtered.length === 1 ? "attempt" : "attempts"}
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Furthest step</TableHead>
                <TableHead>Tier selected</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No drop-offs in this period
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      {a.email && <div className="text-sm font-medium">{a.email}</div>}
                      {a.phone && <div className="text-xs text-muted-foreground">{a.phone}</div>}
                      {!a.email && !a.phone && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{a.name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {STEP_LABELS[a.current_step] ?? a.current_step ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.selected_tier
                      ? <Badge variant="outline" className="bg-[#8B9A7E]/10 text-[#6B7A5E] border-[#8B9A7E]/30">{a.selected_tier}</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{timeAgo(a.last_updated_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(a.started_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdminTier, isOwnerTier } = usePermissions();

  if (!isAdminTier) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h1 className="text-lg font-semibold text-muted-foreground mb-1">Access Denied</h1>
          <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl("Settings")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Internal team tools for managing shop accounts</p>
          </div>
        </div>

        <Tabs defaultValue="dropoffs">
          <TabsList>
            <TabsTrigger value="dropoffs">Drop-offs</TabsTrigger>
            <TabsTrigger value="active">Active Subscriptions</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="signups">All Signups</TabsTrigger>
            <TabsTrigger value="actions">Account Actions</TabsTrigger>
            <TabsTrigger value="superadmins">Superadmins</TabsTrigger>
            {isOwnerTier && <TabsTrigger value="activitylog">Activity Log</TabsTrigger>}
          </TabsList>

          <TabsContent value="dropoffs">
            <DropOffsTab />
          </TabsContent>
          <TabsContent value="active">
            <ActiveSubscriptionsTab />
          </TabsContent>
          <TabsContent value="inactive">
            <InactiveTab />
          </TabsContent>
          <TabsContent value="signups">
            <AllSignupsTab />
          </TabsContent>
          <TabsContent value="actions">
            <AccountActionsTab />
          </TabsContent>
          <TabsContent value="superadmins">
            <SuperadminsTab isOwnerTier={isOwnerTier} />
          </TabsContent>
          {isOwnerTier && (
            <TabsContent value="activitylog">
              <ActivityLogTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
