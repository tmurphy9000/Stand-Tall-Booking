import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, ChevronLeft, Users, Plus, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Permission matrix definition ────────────────────────────
const PERMISSION_SECTIONS = [
  {
    label: "Calendar",
    keys: [
      { key: "calendar.configuration",              label: "Calendar Configuration" },
      { key: "calendar.control_own",                label: "Control Own Schedule" },
      { key: "calendar.control_others",             label: "Control Others' Schedules" },
      { key: "calendar.accept_own_appointments",    label: "Accept Own Appointments" },
      { key: "calendar.accept_others_appointments", label: "Accept Others' Appointments" },
    ],
  },
  {
    label: "Checkout",
    keys: [
      { key: "checkout.customer_checkout",     label: "Process Checkout" },
      { key: "checkout.undo_checkout",         label: "Undo Checkout" },
      { key: "checkout.modify_price_discount", label: "Modify Price / Apply Discount" },
      { key: "checkout.taxes",                 label: "Modify Tax Rates" },
      { key: "checkout.refunds",               label: "Issue Refunds" },
    ],
  },
  {
    label: "Clients",
    keys: [
      { key: "clients.management",       label: "Client Management (PII)" },
      { key: "clients.notes_files",      label: "Client Notes & Files" },
      { key: "clients.custom_fields",    label: "Custom Fields" },
      { key: "clients.sms_opt_in_toggle", label: "Toggle SMS Opt-In" },
    ],
  },
  {
    label: "Inventory",
    keys: [
      { key: "inventory.management",               label: "Manage Inventory" },
      { key: "inventory.management_all_locations", label: "All-Location Inventory" },
      { key: "inventory.vendors_purchase_orders",  label: "Vendors & Purchase Orders" },
    ],
  },
  {
    label: "Reports",
    keys: [
      { key: "reports.own",                   label: "Own Reports" },
      { key: "reports.all_barbers",           label: "All-Barber Reports" },
      { key: "reports.all_locations",         label: "All-Location Reports" },
      { key: "reports.time_card_own",         label: "Own Time Card" },
      { key: "reports.time_card_others",      label: "Others' Time Cards" },
      { key: "reports.cancellations_noshows", label: "Cancellations & No-Shows" },
      { key: "reports.deposits",              label: "Deposits Report" },
    ],
  },
  {
    label: "Payroll",
    keys: [
      { key: "payroll.own",           label: "Own Payroll" },
      { key: "payroll.all",           label: "All-Staff Payroll" },
      { key: "payroll.all_locations", label: "All-Location Payroll" },
      { key: "payroll.management",    label: "Payroll Management (Gusto)" },
    ],
  },
  {
    label: "Time-Off",
    keys: [
      { key: "time_off.own", label: "Own Time-Off Requests" },
      { key: "time_off.all", label: "Approve/Deny All Requests" },
    ],
  },
  {
    label: "Booking Page",
    keys: [
      { key: "booking_page.builder",      label: "Booking Page Builder" },
      { key: "booking_page.embed_widget", label: "Embed Widget" },
    ],
  },
  {
    label: "Settings",
    keys: [
      { key: "settings.general",                 label: "General Settings" },
      { key: "settings.own_profile",             label: "Own Profile" },
      { key: "settings.others_profiles",         label: "Others' Profiles" },
      { key: "settings.access_level_management", label: "Access Level Management" },
      { key: "settings.services",                label: "Services" },
      { key: "settings.discounts",               label: "Discounts" },
      { key: "settings.subscription_billing",    label: "Subscription & Billing" },
      { key: "settings.integrations",            label: "Integrations" },
    ],
  },
  {
    label: "Locations",
    keys: [
      { key: "locations.access",                  label: "Location Access" },
      { key: "locations.multi_location_settings", label: "Multi-Location Settings" },
      { key: "locations.cross_location_calendar", label: "Cross-Location Calendar" },
      { key: "locations.multi_location_admin",    label: "Multi-Location Admin" },
    ],
  },
];

const VALUE_OPTIONS = ["none", "view", "modify"];
const VALUE_LABEL = { none: "None", view: "View", modify: "Modify" };

// ─── Sub-components ───────────────────────────────────────────

function PermValueToggle({ perm_key, value, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {VALUE_OPTIONS.map(opt => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(perm_key, opt)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border",
            value === opt
              ? "bg-[#8B9A7E] text-white border-[#8B9A7E]"
              : "bg-white dark:bg-card text-gray-500 dark:text-gray-400 border-gray-200 dark:border-border hover:border-gray-300",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {VALUE_LABEL[opt]}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function AccessLevelManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftActive, setDraftActive] = useState(true);
  const [draftPerms, setDraftPerms] = useState({});
  const [isNew, setIsNew] = useState(false);

  // ── Queries ────────────────────────────────────────────────
  const { data: levels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ["accessLevels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_levels")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data } = await supabase.from("barbers").select("id, name, access_level_id");
      return data ?? [];
    },
  });

  const { data: editPerms = [], isFetching: loadingPerms } = useQuery({
    queryKey: ["accessLevelPerms", editingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_level_permissions")
        .select("permission_key, permission_value")
        .eq("access_level_id", editingId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!editingId && !isNew,
    onSuccess: (rows) => {
      const map = {};
      rows.forEach(r => { map[r.permission_key] = r.permission_value; });
      setDraftPerms(map);
    },
  });

  // When editing permissions load, sync to draft
  const editPermsMap = useMemo(() => {
    const map = {};
    editPerms.forEach(r => { map[r.permission_key] = r.permission_value; });
    return map;
  }, [editPerms]);

  // ── Mutations ──────────────────────────────────────────────
  const saveLevel = useMutation({
    mutationFn: async () => {
      let levelId = editingId;

      if (isNew) {
        const { data, error } = await supabase
          .from("access_levels")
          .insert({ name: draftName.trim(), description: draftDescription.trim() || null, is_active: draftActive })
          .select()
          .single();
        if (error) throw error;
        levelId = data.id;
      } else {
        const { error } = await supabase
          .from("access_levels")
          .update({ name: draftName.trim(), description: draftDescription.trim() || null, is_active: draftActive, updated_at: new Date().toISOString() })
          .eq("id", levelId);
        if (error) throw error;
      }

      // Upsert permissions
      const permRows = Object.entries(draftPerms).map(([permission_key, permission_value]) => ({
        access_level_id: levelId,
        permission_key,
        permission_value,
      }));
      if (permRows.length > 0) {
        const { error } = await supabase
          .from("access_level_permissions")
          .upsert(permRows, { onConflict: "access_level_id,permission_key" });
        if (error) throw error;
      }

      return levelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessLevels"] });
      queryClient.invalidateQueries({ queryKey: ["accessLevelPerms"] });
      toast.success(isNew ? "Access level created" : "Access level saved");
      closeEditor();
    },
    onError: (err) => {
      toast.error("Save failed", { description: err.message });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase.from("access_levels").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accessLevels"] }),
    onError: (err) => toast.error("Update failed", { description: err.message }),
  });

  // ── Editor helpers ─────────────────────────────────────────
  const openEditor = (level) => {
    setEditingId(level.id);
    setIsNew(false);
    setDraftName(level.name);
    setDraftDescription(level.description ?? "");
    setDraftActive(level.is_active);
    // editPerms will load via query and sync via onSuccess/useMemo
    setDraftPerms({});
  };

  const openNew = () => {
    setEditingId(null);
    setIsNew(true);
    setDraftName("");
    setDraftDescription("");
    setDraftActive(true);
    // Seed all keys to 'none'
    const allNone = {};
    PERMISSION_SECTIONS.forEach(s => s.keys.forEach(k => { allNone[k.key] = "none"; }));
    setDraftPerms(allNone);
  };

  const closeEditor = () => {
    setEditingId(null);
    setIsNew(false);
  };

  const setPermValue = (key, value) => {
    setDraftPerms(prev => ({ ...prev, [key]: value }));
  };

  // Sync loaded perms into draft when they arrive
  const resolvedPerms = useMemo(() => {
    if (isNew) return draftPerms;
    // Start with editPermsMap, overlay any draft changes
    const base = {};
    PERMISSION_SECTIONS.forEach(s => s.keys.forEach(k => {
      base[k.key] = editPermsMap[k.key] ?? "none";
    }));
    return { ...base, ...draftPerms };
  }, [isNew, editPermsMap, draftPerms]);

  const editingLevel = levels.find(l => l.id === editingId) ?? null;
  const isDefaultLevel = editingLevel?.is_default ?? false;

  const countForLevel = (levelId) => barbers.filter(b => b.access_level_id === levelId).length;

  // ── Render: Editor ─────────────────────────────────────────
  if (editingId || isNew) {
    return (
      <div className="space-y-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={closeEditor} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold">{isNew ? "New Access Level" : editingLevel?.name}</h2>
            {isDefaultLevel && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                <Lock className="w-3 h-3" />
                Default level — permissions are read-only. Duplicate to customize.
              </p>
            )}
          </div>
        </div>

        {/* Name / Description */}
        <div className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</p>
          <div>
            <Label className="text-xs text-gray-500">Name *</Label>
            <Input
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="e.g. Senior Barber"
              disabled={isDefaultLevel}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Description</Label>
            <Input
              value={draftDescription}
              onChange={e => setDraftDescription(e.target.value)}
              placeholder="Brief description of this access level"
              disabled={isDefaultLevel}
            />
          </div>
          {!isNew && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-gray-500">Inactive levels can't be assigned to new barbers</p>
              </div>
              <Switch
                checked={draftActive}
                onCheckedChange={setDraftActive}
                disabled={isDefaultLevel}
              />
            </div>
          )}
        </div>

        {/* Assigned employees */}
        {!isNew && (
          <div className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Assigned Employees ({countForLevel(editingId)})
            </p>
            <div className="flex flex-wrap gap-2">
              {barbers.filter(b => b.access_level_id === editingId).length === 0 ? (
                <p className="text-sm text-gray-400">No employees assigned</p>
              ) : (
                barbers
                  .filter(b => b.access_level_id === editingId)
                  .map(b => (
                    <span key={b.id} className="px-2.5 py-1 bg-gray-100 dark:bg-muted rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                      {b.name}
                    </span>
                  ))
              )}
            </div>
            <p className="text-[10px] text-gray-400">To reassign, go to Barbers and change the Access Level there.</p>
          </div>
        )}

        {/* Permission Matrix */}
        <div className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-border">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Permissions</p>
          </div>
          {loadingPerms && !isNew ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-border">
              {PERMISSION_SECTIONS.map(section => (
                <div key={section.label}>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-muted/30">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{section.label}</p>
                  </div>
                  {section.keys.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                      <PermValueToggle
                        perm_key={key}
                        value={resolvedPerms[key] ?? "none"}
                        onChange={isDefaultLevel ? () => {} : setPermValue}
                        disabled={isDefaultLevel}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isDefaultLevel && (
          <div className="flex justify-end gap-3 pb-6">
            <Button variant="outline" onClick={closeEditor} disabled={saveLevel.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => saveLevel.mutate()}
              disabled={saveLevel.isPending || !draftName.trim()}
              className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white"
            >
              {saveLevel.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                isNew ? "Create Access Level" : "Save Changes"
              )}
            </Button>
          </div>
        )}
        {isDefaultLevel && (
          <div className="flex justify-end pb-6">
            <Button variant="outline" onClick={closeEditor}>Close</Button>
          </div>
        )}
      </div>
    );
  }

  // ── Render: List ───────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#8B9A7E]" />
            Access Levels
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Control what each barber can see and do. Assign levels in the Barbers tab.
          </p>
        </div>
        <Button
          size="sm"
          onClick={openNew}
          className="h-8 bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          New Level
        </Button>
      </div>

      {levelsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {levels.map(level => (
            <div
              key={level.id}
              className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{level.name}</p>
                    {level.is_default && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-muted text-gray-500 dark:text-gray-400 font-semibold">
                        Default
                      </span>
                    )}
                    {!level.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold">
                        Inactive
                      </span>
                    )}
                  </div>
                  {level.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{level.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {countForLevel(level.id)} employee{countForLevel(level.id) !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!level.is_default && (
                    <Switch
                      checked={level.is_active}
                      onCheckedChange={v => toggleActive.mutate({ id: level.id, is_active: v })}
                    />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openEditor(level)}
                  >
                    {level.is_default ? "View" : "Edit"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
