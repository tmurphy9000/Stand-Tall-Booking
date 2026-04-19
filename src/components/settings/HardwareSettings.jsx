import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const HARDWARE_STORAGE_KEY = "stripe_hardware_settings";

const READER_MODELS = [
  { value: "bbpos_wisepos_e", label: "BBPOS WisePOS E (countertop)" },
  { value: "stripe_m2", label: "Stripe Reader M2 (handheld)" },
  { value: "verifone_p400", label: "Verifone P400 (countertop)" },
  { value: "simulated", label: "Simulated (testing)" },
];

function loadSettings() {
  try {
    const stored = localStorage.getItem(HARDWARE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      enabled: false,
      reader_model: "",
      location_id: "",
      reader_id: "",
      auto_print_receipt: false,
      collect_tip_on_terminal: true,
    };
  } catch {
    return {
      enabled: false,
      reader_model: "",
      location_id: "",
      reader_id: "",
      auto_print_receipt: false,
      collect_tip_on_terminal: true,
    };
  }
}

export default function HardwareSettings() {
  const [hw, setHw] = useState(loadSettings);

  const update = (key, value) => {
    setHw((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(HARDWARE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem(HARDWARE_STORAGE_KEY, JSON.stringify(hw));
    toast.success("Hardware settings saved");
  };

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-sm font-semibold">Hardware Settings</h2>

      {/* Stripe Terminal */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Stripe Terminal</p>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Enable Stripe Terminal</Label>
            <p className="text-xs text-gray-400 mt-0.5">
              Enable this when you have physical Stripe hardware connected.
            </p>
          </div>
          <Switch checked={hw.enabled} onCheckedChange={(val) => update("enabled", val)} />
        </div>

        {hw.enabled && (
          <>
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div>
                <Label className="text-xs text-gray-500">Reader Model</Label>
                <Select value={hw.reader_model} onValueChange={(val) => update("reader_model", val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your reader model" />
                  </SelectTrigger>
                  <SelectContent>
                    {READER_MODELS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Stripe Location ID</Label>
                <p className="text-xs text-gray-400 mb-1">Found in your Stripe Dashboard → Terminal → Locations</p>
                <Input
                  placeholder="tml_loc_XXXXXXXXXXXXXXXX"
                  value={hw.location_id}
                  onChange={(e) => update("location_id", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500">Reader ID (optional)</Label>
                <p className="text-xs text-gray-400 mb-1">Assign a specific reader. Leave blank to auto-assign.</p>
                <Input
                  placeholder="tmr_XXXXXXXXXXXXXXXX"
                  value={hw.reader_id}
                  onChange={(e) => update("reader_id", e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Terminal Behavior */}
      {hw.enabled && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Terminal Behavior</p>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Collect Tip on Terminal</Label>
              <p className="text-xs text-gray-400 mt-0.5">
                Show tip selection screen on the customer-facing hardware.
              </p>
            </div>
            <Switch
              checked={hw.collect_tip_on_terminal}
              onCheckedChange={(val) => update("collect_tip_on_terminal", val)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Auto-Print Receipt</Label>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatically print a receipt after each completed transaction.
              </p>
            </div>
            <Switch
              checked={hw.auto_print_receipt}
              onCheckedChange={(val) => update("auto_print_receipt", val)}
            />
          </div>
        </div>
      )}

      <Button onClick={handleSave} className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white">
        Save Hardware Settings
      </Button>
    </div>
  );
}