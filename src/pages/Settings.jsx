import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Store, Users, Scissors, Clock, Shield } from "lucide-react";
import BarberManager from "../components/settings/BarberManager";
import ServiceManager from "../components/settings/ServiceManager";
import ShopHoursEditor from "../components/settings/ShopHoursEditor";
import PermissionsManager from "../components/settings/PermissionsManager";
import AdminPasswordManager from "../components/settings/AdminPasswordManager";
import { usePermissions } from "../components/permissions/usePermissions";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

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
      <h1 className="text-lg font-bold mb-4">Settings</h1>

      <Tabs defaultValue="barbers" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full bg-gray-100 h-9">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Default Commission Rate %</Label>
              <Input
                type="number"
                value={settings.default_commission_rate || 50}
                onChange={e => saveSettings.mutate({ ...settings, default_commission_rate: parseFloat(e.target.value) || 50 })}
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
        </TabsContent>

        {isAdmin && (
          <TabsContent value="permissions">
            <div className="space-y-4">
              <PermissionsManager />
              <AdminPasswordManager settings={settings} />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}