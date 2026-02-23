import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function BarberServiceDurations({ barber, services, onSave, onClose }) {
  const [availableServices, setAvailableServices] = useState(barber.available_services || []);
  const [durations, setDurations] = useState(barber.service_durations || {});
  const [prices, setPrices] = useState(barber.service_prices || {});

  const handleSave = () => {
    onSave(barber.id, { 
      available_services: availableServices, 
      service_durations: durations, 
      service_prices: prices 
    });
  };

  const toggleService = (serviceId) => {
    setAvailableServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{barber.name}'s Services & Pricing</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {services.filter(s => s.is_active !== false).map(service => {
            const isEnabled = availableServices.includes(service.id);
            
            return (
              <div key={service.id} className={`border rounded-lg p-4 space-y-3 transition-all ${!isEnabled && 'opacity-50 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{service.name}</p>
                    <p className="text-xs text-gray-500">Default: {service.duration} min • ${service.price}</p>
                  </div>
                  <Switch 
                    checked={isEnabled} 
                    onCheckedChange={() => toggleService(service.id)}
                  />
                </div>

                {isEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Custom Duration (min)</Label>
                      <Input 
                        type="number"
                        placeholder={String(service.duration)}
                        value={durations[service.id] || ''}
                        onChange={e => setDurations(prev => ({...prev, [service.id]: e.target.value ? parseInt(e.target.value) : undefined}))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Custom Price ($)</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder={String(service.price)}
                        value={prices[service.id] ?? ''}
                        onChange={e => setPrices(prev => ({...prev, [service.id]: e.target.value ? parseFloat(e.target.value) : undefined}))}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}