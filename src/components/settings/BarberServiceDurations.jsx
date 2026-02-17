import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Save } from "lucide-react";

export default function BarberServiceDurations({ barber, services, onSave, onClose }) {
  const [durations, setDurations] = useState(barber.service_durations || {});

  const handleSave = () => {
    onSave(barber.id, { ...barber, service_durations: durations });
    onClose();
  };

  const setDuration = (serviceId, value) => {
    setDurations(prev => ({
      ...prev,
      [serviceId]: value ? parseInt(value) : undefined
    }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#8B9A7E]" />
            Service Durations - {barber.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <p className="text-xs text-gray-500">
            Set custom durations for this barber. Leave blank to use default service duration.
          </p>

          {services.filter(s => s.is_active !== false).map(service => (
            <div key={service.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-gray-100">
              <div className="flex-1">
                <p className="text-sm font-medium">{service.name}</p>
                <p className="text-[10px] text-gray-500">Default: {service.duration} min</p>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  placeholder={service.duration.toString()}
                  value={durations[service.id] || ""}
                  onChange={(e) => setDuration(service.id, e.target.value)}
                  className="h-8 text-xs"
                  min="15"
                  step="15"
                />
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