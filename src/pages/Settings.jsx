import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Store, Users, Scissors, Clock, Shield, Mail, DollarSign, PhoneOff, Tag, Monitor, Cpu, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import BarberManager from "../components/settings/BarberManager";
import ServiceManager from "../components/settings/ServiceManager";
import ShopHoursEditor from "../components/settings/ShopHoursEditor";
import PermissionsManager from "../components/settings/PermissionsManager";
import RolePermissionsManager from "../components/settings/RolePermissionsManager";
import AdminPasswordManager from "../components/settings/AdminPasswordManager";
import InviteBarberForm from "../components/settings/InviteBarberForm";
import PayrollManager from "../components/settings/PayrollManager";
import CallOffManager from "../components/settings/CallOffManager";
import DiscountManager from "../components/settings/DiscountManager";
import DisplaySettings from "../components/settings/DisplaySettings";
import HardwareSettings from "../components/settings/HardwareSettings";
import SubscriptionManager from "../components/settings/SubscriptionManager";
import { usePermissions } from "../components/permissions/usePermissions";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { isAdmin, hasFullAccess } = usePermissions();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [activeTab, setActiveTab] = useState("barbers");

  const { data: barbers = [], isLoading: barbersLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: settingsArr = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const settings = settingsArr[0] || {};

  const createBarber = useMutation({
    mutationFn: (data) => base44.entities.Barber.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["barbers"] }),
  });

  const updateBarber = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Barber.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["barbers"] }),
  });

  const deleteBarber = useMutation({
    mutationFn: (id) => base44.entities.Barber.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["barbers"] }),
  });

  const createService = useMutation({
    mutationFn: (data) => base44.entities.Service.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const updateService = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Service.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const deleteService = useMutation({
    mutationFn: (id) => base44.entities.Service.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const saveSettings = useMutation({
    mutationFn: async (data) => {
      if (settings.id) {
        return base44.entities.ShopSettings.update(settings.id, data);
      }
      return base44.entities.ShopSettings.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopSettings"] }),
  });

  const isLoading = barbersLoading || servicesLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#C9A94E]" />
      </div>
    );
  }

  const navItems = [
    { value: "barbers", label: "Barbers", icon: Users },
    { value: "services", label: "Services", icon: Scissors },
    { value: "hours", label: "Shop Hours", icon: Clock },
    { value: "shop", label: "Shop", icon: Store },
    { value: "discounts", label: "Discounts", icon: Tag },
    { value: "display", label: "Display", icon: Monitor },
    { value: "hardware", label: "Hardware", icon: Cpu },
    ...(hasFullAccess ? [
      { value: "calloff", label: "Call-Off", icon: PhoneOff },
      { value: "payroll", label: "Payroll", icon: DollarSign },
    ] : []),
    ...(isAdmin ? [{ value: "permissions", label: "Access", icon: Shield }] : []),
    ...(isAdmin ? [{ value: "subscription", label: "Subscription", icon: CreditCard }] : []),
  ];

  return (
    <div className="flex h-screen">
      {/* Vertical sidebar */}
      <div className="w-36 flex-shrink-0 bg-[#0A0A0A] flex flex-col py-4 gap-1 px-2">
        <p className="text-[10px] text-white/40 uppercase font-semibold px-2 mb-2 tracking-wider">Settings</p>
        {navItems.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left",
              activeTab === value
                ? "bg-[#8B9A7E] text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}

        {hasFullAccess && (
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left text-white/60 hover:text-white hover:bg-white/10 mt-auto"
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            Invite Barber
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "barbers" && (
          <BarberManager
            barbers={barbers}
            services={services}
            onCreate={(data) => createBarber.mutate(data)}
            onUpdate={(id, data) => updateBarber.mutate({ id, data })}
            onDelete={(id) => deleteBarber.mutate(id)}
            onCreateService={(data) => createService.mutate(data)}
            onUpdateService={(id, data) => updateService.mutate({ id, data })}
            onDeleteService={(id) => deleteService.mutate(id)}
          />
        )}

        {activeTab === "services" && (
          <ServiceManager
            services={services}
            onCreate={(data) => createService.mutate(data)}
            onUpdate={(id, data) => updateService.mutate({ id, data })}
            onDelete={(id) => deleteService.mutate(id)}
          />
        )}

        {activeTab === "hours" && (
          <ShopHoursEditor
            hours={settings.operating_hours || {}}
            onChange={(hours) => saveSettings.mutate({ ...settings, operating_hours: hours })}
          />
        )}

        {activeTab === "shop" && (
          <div className="space-y-4 max-w-md">
            <h2 className="text-sm font-semibold">Shop Settings</h2>
            <div>
              <Label className="text-xs text-gray-500">Shop Name</Label>
              <Input
                value={settings.shop_name || "Stand Tall Barbershop"}
                onChange={e => saveSettings.mutate({ ...settings, shop_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Default Tax Rate %</Label>
              <Input
                type="number"
                value={settings.default_tax_rate || 7.5}
                onChange={e => saveSettings.mutate({ ...settings, default_tax_rate: parseFloat(e.target.value) || 7.5 })}
              />
            </div>
          </div>
        )}

        {activeTab === "discounts" && <DiscountManager />}

        {activeTab === "display" && <DisplaySettings />}
        {activeTab === "hardware" && <HardwareSettings />}
        {hasFullAccess && activeTab === "calloff" && <CallOffManager />}
        {hasFullAccess && activeTab === "payroll" && <PayrollManager />}

        {isAdmin && activeTab === "subscription" && <SubscriptionManager />}

        {isAdmin && activeTab === "permissions" && (
          <div className="space-y-4">
            <PermissionsManager />
            <RolePermissionsManager />
            <AdminPasswordManager settings={settings} />
          </div>
        )}
      </div>

      <InviteBarberForm
        open={showInviteForm}
        onClose={() => setShowInviteForm(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["barberSensitiveInfo"] })}
      />
    </div>
  );
}