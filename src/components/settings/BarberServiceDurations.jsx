import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, DollarSign, Save } from "lucide-react";

export default function BarberServiceDurations({ barber, services, onSave, onClose }) {
  const [durations, setDurations] = useState(barber.service_durations || {});
  const [prices, setPrices] = useState(barber.service_prices || {});

  const handleSave = () => {
    onSave(barber.id, { 
      ...barber, 
      service_durations: durations,
      service_prices: prices
    });
    onClose();
  };

  const setDuration = (serviceId, value) => {
    setDurations(prev => ({
      ...prev,
      [serviceId]: value ? parseInt(value) : undefined
    }));
  };

  const setPrice = (serviceId, value) => {
    setPrices(prev => ({
      ...prev,
      [serviceId]: value !== "" ? parseFloat(value) : undefined
    }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#8B9A7E]" />
            Service Settings - {barber.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <p className="text-xs text-gray-500">
            Set custom durations and prices for this barber. Leave blank to use defaults.
          </p>

          {services.filter(s => s.is_active !== false).map(service => (
            <div key={service.id} className="p-3 rounded-lg border border-gray-100">
              <p className="text-sm font-medium mb-2">{service.name}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Duration (min)
                  </Label>
                  <Input
                    type="number"
                    placeholder={service.duration.toString()}
                    value={durations[service.id] || ""}
                    onChange={(e) => setDuration(service.id, e.target.value)}
                    className="h-8 text-xs mt-1"
                    min="15"
                    step="15"
                  />
                  <p className="text-[9px] text-gray-400 mt-0.5">Default: {service.duration} min</p>
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Price
                  </Label>
                  <Input
                    type="number"
                    placeholder={service.price.toString()}
                    value={prices[service.id] !== undefined ? prices[service.id] : ""}
                    onChange={(e) => setPrice(service.id, e.target.value)}
                    className="h-8 text-xs mt-1"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-[9px] text-gray-400 mt-0.5">Default: ${service.price}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-[#8B9A7E] hover:bg-[#6B7A5E]">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}