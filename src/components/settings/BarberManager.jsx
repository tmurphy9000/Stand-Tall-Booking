import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Clock, Camera, Trash2, CheckCircle, XCircle, Timer } from "lucide-react";
import BarberHoursEditor from "./BarberHoursEditor";
import BarberServiceDurations from "./BarberServiceDurations";
import { useQuery } from "@tanstack/react-query";

export default function BarberManager({ barbers, onCreate, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [showHours, setShowHours] = useState(null);
  const [showDurations, setShowDurations] = useState(null);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", service_commission_rate: 50, product_commission_rate: 10,
    tier: "tier_1", is_active: true, photo_url: "",
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", service_commission_rate: 50, product_commission_rate: 10, tier: "tier_1", is_active: true, photo_url: "" });
    setShowForm(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm(b);
    setShowForm(true);
  };

  const save = () => {
    if (editing) onUpdate(editing.id, form);
    else onCreate(form);
    setShowForm(false);
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("photo_url", file_url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Barbers</h3>
        <Button size="sm" className="h-7 text-xs bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-1" onClick={openNew}>
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {barbers.map(b => (
          <div key={b.id} className="bg-gray-50 rounded-xl px-3 py-3 flex items-center gap-3">
            {b.photo_url ? (
              <img src={b.photo_url} alt={b.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#B0BFA4]/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B0BFA4] to-[#8B9A7E] flex items-center justify-center text-white font-bold text-sm">
                {b.name?.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{b.name}</p>
                {b.is_active !== false ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <p className="text-[10px] text-gray-400">{b.tier?.replace('tier_', 'Tier ') || 'Tier 1'} • Services: {b.service_commission_rate || 50}% • Products: {b.product_commission_rate || 10}%</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowHours(b)}>
                <Clock className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowDurations(b)}>
                <Timer className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(b)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" 
                onClick={() => {
                  if (window.confirm(`Delete ${b.name}? This cannot be undone.`)) {
                    onDelete(b.id);
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Barber form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Barber" : "Add Barber"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                {form.photo_url ? (
                  <img src={form.photo_url} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-[#B0BFA4]/30" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </label>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Email</Label>
                <Input value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Phone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Service Commission %</Label>
                <Input type="number" value={form.service_commission_rate} onChange={e => set("service_commission_rate", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Product Commission %</Label>
                <Input type="number" value={form.product_commission_rate} onChange={e => set("product_commission_rate", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Tier</Label>
              <Select value={form.tier} onValueChange={v => set("tier", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier_1">Tier 1</SelectItem>
                  <SelectItem value="tier_2">Tier 2</SelectItem>
                  <SelectItem value="tier_3">Tier 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Active</Label>
              <Switch checked={form.is_active !== false} onCheckedChange={v => set("is_active", v)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save} className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white">
              {editing ? "Update" : "Add Barber"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hours editor dialog */}
      <Dialog open={!!showHours} onOpenChange={() => setShowHours(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showHours?.name}'s Hours</DialogTitle>
          </DialogHeader>
          {showHours && (
            <BarberHoursEditor
              hours={showHours.hours || {}}
              onChange={(h) => {
                onUpdate(showHours.id, { hours: h });
                setShowHours({ ...showHours, hours: h });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {showDurations && (
        <BarberServiceDurations
          barber={showDurations}
          services={services}
          onSave={(id, data) => {
            onUpdate(id, data);
            setShowDurations(null);
          }}
          onClose={() => setShowDurations(null)}
        />
      )}
    </div>
  );
}