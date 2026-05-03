import React, { useState } from "react";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Store, Users, Scissors, Clock, Shield, Mail, DollarSign, PhoneOff, Tag, Monitor, Cpu, CreditCard, Bell, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import BarberManager from "../components/settings/BarberManager";
import ServiceManager from "../components/settings/ServiceManager";
import ShopHoursEditor from "../components/settings/ShopHoursEditor";
import PermissionsManager from "../components/settings/PermissionsManager";
import RolePermissionsManager from "../components/settings/RolePermissionsManager";
import AdminPasswordManager from "../components/settings/AdminPasswordManager";
import InviteBarberForm from "../components/settings/InviteBarberForm";
import TermsAndConditions from "../components/settings/TermsAndConditions";
import PayrollManager from "../components/settings/PayrollManager";
import CallOffManager from "../components/settings/CallOffManager";
import DiscountManager from "../components/settings/DiscountManager";
import DisplaySettings from "../components/settings/DisplaySettings";
import HardwareSettings from "../components/settings/HardwareSettings";
import SubscriptionManager from "../components/settings/SubscriptionManager";
import ClientNotificationsSettings from "../components/settings/ClientNotificationsSettings";
import BookingPageSettings from "../components/settings/BookingPageSettings";
import { usePermissions } from "../components/permissions/usePermissions";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { isAdmin, hasFullAccess } = usePermissions();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [activeTab, setActiveTab] = useState("barbers");
  const [draftHours, setDraftHours] = useState(null);
  const [draftProductTax, setDraftProductTax] = useState(null);
  const [draftServiceTax, setDraftServiceTax] = useState(null);

  const { data: barbers = [], isLoading: barbersLoading } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => entities.Service.list(),
  });

  const { data: settingsArr = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => entities.ShopSettings.list(),
  });
  const settings = settingsArr[0] || {};

  const createBarber = useMutation({
    mutationFn: (data) => entities.Barber.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["barbers"] }),
  });

  const updateBarber = useMutation({
    mutationFn: ({ id, data }) => entities.Barber.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["barbers"] }),
  });

  const deleteBarber = useMutation({
    mutationFn: (id) => entities.Barber.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["barbers"] }),
  });

  const createService = useMutation({
    mutationFn: (data) => entities.Service.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const updateService = useMutation({
    mutationFn: ({ id, data }) => entities.Service.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const deleteService = useMutation({
    mutationFn: (id) => entities.Service.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const saveSettings = useMutation({
    mutationFn: async (data) => {
      if (settings.id) {
        return entities.ShopSettings.update(settings.id, data);
      }
      return entities.ShopSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      setDraftHours(null);
      setDraftProductTax(null);
      setDraftServiceTax(null);
      toast.success("Settings saved");
    },
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
    { value: "shop", label: "Tax Rates", icon: Store },
    { value: "discounts", label: "Discounts", icon: Tag },
    { value: "display", label: "Display", icon: Monitor },
    { value: "hardware", label: "Hardware", icon: Cpu },
    { value: "client_notifications", label: "Notifications", icon: Bell },
    { value: "booking_page", label: "Booking Page", icon: BookOpen },
    ...(hasFullAccess ? [
      { value: "payroll", label: "Payroll", icon: DollarSign },
    ] : []),
    ...(hasFullAccess ? [{ value: "permissions", label: "Permissions", icon: Shield }] : []),
    ...(isAdmin ? [{ value: "subscription", label: "Subscription", icon: CreditCard }] : []),
    ...(hasFullAccess ? [{ value: "calloff", label: "Call-Off", icon: PhoneOff }] : []),
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

        <div className="mt-2 border-t border-white/10 pt-2">
          <TermsAndConditions />
          {hasFullAccess && (
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left text-white/60 hover:text-white hover:bg-white/10 w-full"
            >
              <Mail className="w-4 h-4 flex-shrink-0" />
              Invite Barber
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "barbers" && (
          <BarberManager
            barbers={barbers}
            services={services}
            onCreate={(data) => createBarber.mutate(data)}
            onUpdate={(id, data) => updateBarber.mutateAsync({ id, data })}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Shop Hours</h2>
              <Button
                size="sm"
                className="h-8 bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-2"
                disabled={saveSettings.isPending || draftHours === null}
                onClick={() => saveSettings.mutate({ ...settings, operating_hours: draftHours })}
              >
                {saveSettings.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Hours
              </Button>
            </div>
            <ShopHoursEditor
              hours={draftHours ?? (settings.operating_hours || {})}
              onChange={setDraftHours}
            />
          </div>
        )}

        {activeTab === "shop" && (
          <div className="space-y-4 max-w-md">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Tax Rates</h2>
              <Button
                size="sm"
                className="h-8 bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-2"
                disabled={saveSettings.isPending}
                onClick={() => saveSettings.mutate({
                  ...settings,
                  default_tax_rate: draftProductTax ?? (settings.default_tax_rate ?? 0),
                  default_service_tax_rate: draftServiceTax ?? (settings.default_service_tax_rate ?? 0),
                })}
              >
                {saveSettings.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </Button>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Product / Merch Tax Rate %</Label>
              <Input
                type="number"
                step="0.01"
                value={draftProductTax ?? (settings.default_tax_rate ?? 0)}
                onChange={e => { const v = parseFloat(e.target.value); setDraftProductTax(isNaN(v) ? 0 : v); }}
              />
              <p className="text-[10px] text-gray-400 mt-1">Applied to retail products sold at checkout</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Service Tax Rate %</Label>
              <Input
                type="number"
                step="0.01"
                value={draftServiceTax ?? (settings.default_service_tax_rate ?? 0)}
                onChange={e => { const v = parseFloat(e.target.value); setDraftServiceTax(isNaN(v) ? 0 : v); }}
              />
              <p className="text-[10px] text-gray-400 mt-1">Applied to services at checkout (usually 0%)</p>
            </div>
          </div>
        )}

        {activeTab === "discounts" && <DiscountManager />}

        {activeTab === "display" && <DisplaySettings />}
        {activeTab === "hardware" && <HardwareSettings />}
        {activeTab === "client_notifications" && <ClientNotificationsSettings />}
        {activeTab === "booking_page" && <BookingPageSettings />}
        {hasFullAccess && activeTab === "calloff" && <CallOffManager />}
        {hasFullAccess && activeTab === "payroll" && <PayrollManager />}

        {isAdmin && activeTab === "subscription" && <SubscriptionManager />}

        {hasFullAccess && activeTab === "permissions" && (
          <div className="space-y-4">
            <PermissionsManager />
            <RolePermissionsManager />
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