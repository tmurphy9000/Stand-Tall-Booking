import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Search } from "lucide-react";
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
  Free: "bg-gray-100 text-gray-700 border-gray-200",
  Starter: "bg-blue-50 text-blue-700 border-blue-200",
  Pro: "bg-[#8B9A7E]/10 text-[#6B7A5E] border-[#8B9A7E]/30",
};

function PlanBadge({ plan }) {
  return <Badge variant="outline" className={PLAN_BADGE_STYLES[plan] || ""}>{plan}</Badge>;
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-green-50 text-green-700 border-green-200",
    inactive: "bg-gray-100 text-gray-600 border-gray-200",
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
        <span className="text-sm text-gray-500">Signed up:</span>
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
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
            <p className="text-sm text-gray-400">No shops found.</p>
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
                  <p className="text-xs text-gray-500">{account.owner_name}</p>
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
                <p className="text-xs text-gray-500">{selected.owner_name}</p>
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

export default function AdminDashboard() {
  const { isSuperAdmin } = usePermissions();

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h1 className="text-lg font-semibold text-gray-700 mb-1">Access Denied</h1>
          <p className="text-sm text-gray-400">You don't have permission to view this page.</p>
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
            <p className="text-gray-600 text-sm">Internal team tools for managing shop accounts</p>
          </div>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Subscriptions</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="signups">All Signups</TabsTrigger>
            <TabsTrigger value="actions">Account Actions</TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </div>
  );
}
