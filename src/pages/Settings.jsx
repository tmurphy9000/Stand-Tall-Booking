import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Store, Users, Scissors, Clock, Shield, Mail, DollarSign } from "lucide-react";
import BarberManager from "../components/settings/BarberManager";
import ServiceManager from "../components/settings/ServiceManager";
import ShopHoursEditor from "../components/settings/ShopHoursEditor";
import PermissionsManager from "../components/settings/PermissionsManager";
import AdminPasswordManager from "../components/settings/AdminPasswordManager";
import InviteBarberForm from "../components/settings/InviteBarberForm";
import PayrollManager from "../components/settings/PayrollManager";
import { usePermissions } from "../components/permissions/usePermissions";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { isAdmin, hasFullAccess } = usePermissions();
  const [showInviteForm, setShowInviteForm] = useState(false);

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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Settings</h1>
        {hasFullAccess && (
          <Button 
            size="sm" 
            className="h-8 text-xs bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-1"
            onClick={() => setShowInviteForm(true)}
          >
            <Mail className="w-3 h-3" /> Invite Barber
          </Button>
        )}
      </div>

      <Tabs defaultValue="barbers" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full bg-gray-100 h-9">
          <TabsTrigger value="barbers" className="text-xs gap-1 data-[state=active]:bg-white">
            <Users className="w-3 h-3" /> Barbers
          </TabsTrigger>
          <TabsTrigger value="services" className="text-xs gap-1 data-[state=active]:bg-white">
            <Scissors className="w-3 h-3" /> Services
          </TabsTrigger>
          <TabsTrigger value="hours" className="text-xs gap-1 data-[state=active]:bg-white">
            <Clock className="w-3 h-3" /> Hours
          </TabsTrigger>
          <TabsTrigger value="shop" className="text-xs gap-1 data-[state=active]:bg-white">
            <Store className="w-3 h-3" /> Shop
          </TabsTrigger>
          {hasFullAccess && (
            <TabsTrigger value="payroll" className="text-xs gap-1 data-[state=active]:bg-white">
              <DollarSign className="w-3 h-3" /> Payroll
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="permissions" className="text-xs gap-1 data-[state=active]:bg-white">
              <Shield className="w-3 h-3" /> Access
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="barbers">
          <BarberManager
            barbers={barbers}
            onCreate={(data) => createBarber.mutate(data)}
            onUpdate={(id, data) => updateBarber.mutate({ id, data })}
            onDelete={(id) => deleteBarber.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServiceManager
            services={services}
            onCreate={(data) => createService.mutate(data)}
            onUpdate={(id, data) => updateService.mutate({ id, data })}
            onDelete={(id) => deleteService.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="hours">
          <ShopHoursEditor
            hours={settings.operating_hours || {}}
            onChange={(hours) => saveSettings.mutate({ ...settings, operating_hours: hours })}
          />
        </TabsContent>

        <TabsContent value="shop" className="space-y-4">
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

          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Enable Tier Commissions</Label>
              <p className="text-xs text-gray-500">Turn on/off tier-based commission reporting</p>
            </div>
            <Switch
              checked={settings.enable_tier_commissions !== false}
              onCheckedChange={v => saveSettings.mutate({ ...settings, enable_tier_commissions: v })}
            />
          </div>

          {settings.enable_tier_commissions !== false && (
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Commission Tier Thresholds ($)</Label>
              <div className="grid grid-cols-3 gap-2">
                {["silver", "gold", "platinum"].map(tier => (
                  <div key={tier}>
                    <Label className="text-[10px] capitalize text-gray-400">{tier}</Label>
                    <Input
                      type="number"
                      value={settings.tier_thresholds?.[tier] || 0}
                      onChange={e => saveSettings.mutate({
                        ...settings,
                        tier_thresholds: {
                          ...(settings.tier_thresholds || {}),
                          [tier]: parseFloat(e.target.value) || 0,
                        },
                      })}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {hasFullAccess && (
          <TabsContent value="payroll">
            <PayrollManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="permissions">
            <div className="space-y-4">
              <PermissionsManager />
              <AdminPasswordManager settings={settings} />
            </div>
          </TabsContent>
        )}
      </Tabs>

      <InviteBarberForm 
        open={showInviteForm} 
        onClose={() => setShowInviteForm(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["barberSensitiveInfo"] })}
      />
    </div>
  );
}