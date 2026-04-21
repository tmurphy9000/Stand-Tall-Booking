import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Clock, Camera, Trash2, CheckCircle, XCircle, Timer, Scissors, Loader2 } from "lucide-react";
import BarberHoursEditor from "./BarberHoursEditor";
import BarberServiceDurations from "./BarberServiceDurations";
import ServiceManager from "./ServiceManager";
import { toast } from "sonner";

const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DEFAULT_DAY = { start: "09:00", end: "18:00", off: false };

function initHours(savedHours) {
  return ALL_DAYS.reduce((acc, day) => {
    acc[day] = { ...DEFAULT_DAY, ...(savedHours?.[day] || {}) };
    return acc;
  }, {});
}

export default function BarberManager({ barbers, services = [], onCreate, onUpdate, onDelete, onCreateService, onUpdateService, onDeleteService }) {
  const [showForm, setShowForm] = useState(false);
  const [showHours, setShowHours] = useState(null);
  const [draftHours, setDraftHours] = useState({});
  const [draftBlocked, setDraftBlocked] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [showDurations, setShowDurations] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", service_commission_rate: 50, product_commission_rate: 10,
    is_active: true, photo_url: "",
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", service_commission_rate: 50, product_commission_rate: 10, is_active: true, photo_url: "" });
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
    const path = `barbers/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('photos').upload(path, file, { upsert: true });
    if (error) { console.error('Photo upload failed:', error); return; }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(data.path);
    set("photo_url", publicUrl);
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
              <img src={b.photo_url} alt={b.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-[#B0BFA4]/30 flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#B0BFA4] to-[#8B9A7E] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {b.name?.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{b.name}</p>
                {b.is_active !== false ? (
                  <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Active</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Terminated</span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mb-2">Services: {b.service_commission_rate || 50}% • Products: {b.product_commission_rate || 10}%</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs" onClick={() => { setShowHours(b); setDraftHours(initHours(b.hours)); setDraftBlocked(b.bookings_blocked || false); }}>
                  <Clock className="w-4 h-4" /> Hours
                </Button>
                <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs text-[#8B9A7E] border-[#8B9A7E]/30 hover:bg-[#8B9A7E]/10" onClick={() => setShowDurations(b)}>
                  <Scissors className="w-4 h-4" /> Services
                </Button>
                <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs" onClick={() => openEdit(b)}>
                  <Pencil className="w-4 h-4" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 gap-1.5 text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    if (window.confirm(`Delete ${b.name}? This cannot be undone.`)) {
                      onDelete(b.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <Switch
                checked={b.online_bookable !== false}
                onCheckedChange={v => onUpdate(b.id, { online_bookable: v })}
              />
              <span className="text-[9px] text-gray-400">Online</span>
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
                <Input type="number" value={form.service_commission_rate} onChange={e => set("service_commission_rate", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Product Commission %</Label>
                <Input type="number" value={form.product_commission_rate} onChange={e => set("product_commission_rate", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Permission Classification</Label>
              <Select value={form.permission_level || "service_provider"} onValueChange={v => set("permission_level", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permission level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service_provider">Service Provider</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Employment Status</Label>
                <p className="text-xs text-gray-500">{form.is_active !== false ? "Active" : "Terminated"}</p>
              </div>
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
              hours={draftHours}
              onChange={setDraftHours}
              bookingsBlocked={draftBlocked}
              onBlockBookingsChange={setDraftBlocked}
            />
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowHours(null)}>Cancel</Button>
            <Button
              className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-2"
              disabled={savingHours}
              onClick={async () => {
                setSavingHours(true);
                try {
                  await onUpdate(showHours.id, { hours: draftHours, bookings_blocked: draftBlocked });
                  toast.success("Hours saved");
                  setShowHours(null);
                } catch (err) {
                  toast.error("Failed to save hours");
                  console.error(err);
                } finally {
                  setSavingHours(false);
                }
              }}
            >
              {savingHours && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Hours
            </Button>
          </DialogFooter>
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