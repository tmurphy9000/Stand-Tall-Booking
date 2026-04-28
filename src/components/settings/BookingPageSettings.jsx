import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Instagram, Facebook, Globe } from "lucide-react";

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", Icon: Instagram, placeholder: "https://instagram.com/yourshop" },
  { key: "facebook",  label: "Facebook",  Icon: Facebook,  placeholder: "https://facebook.com/yourshop" },
  { key: "tiktok",    label: "TikTok",    Icon: Globe,     placeholder: "https://tiktok.com/@yourshop" },
];

function daysToUnit(days) {
  if (days % 30 === 0) return { value: days / 30, unit: "months" };
  if (days % 7 === 0)  return { value: days / 7,  unit: "weeks"  };
  return { value: days, unit: "days" };
}

function unitToDays(value, unit) {
  const n = parseInt(value, 10) || 1;
  if (unit === "months") return n * 30;
  if (unit === "weeks")  return n * 7;
  return n;
}

export default function BookingPageSettings() {
  const queryClient = useQueryClient();

  const { data: settingsArr = [], isLoading } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => entities.ShopSettings.list(),
  });
  const settings = settingsArr[0] || {};

  // Local draft state
  const [windowValue, setWindowValue] = useState(60);
  const [windowUnit, setWindowUnit]   = useState("days");
  const [logoUrl, setLogoUrl]         = useState("");
  const [uploading, setUploading]     = useState(false);
  const [shopName, setShopName]       = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone]     = useState("");
  const [shopEmail, setShopEmail]     = useState("");
  const [social, setSocial]           = useState({ instagram: { enabled: false, url: "" }, facebook: { enabled: false, url: "" }, tiktok: { enabled: false, url: "" } });

  // Sync drafts from DB whenever settings load
  useEffect(() => {
    if (!settings.id) return;
    const { value, unit } = daysToUnit(settings.max_booking_days_ahead ?? 60);
    setWindowValue(value);
    setWindowUnit(unit);
    setLogoUrl(settings.booking_logo_url || "");
    setShopName(settings.shop_name || "");
    setShopAddress(settings.shop_address || "");
    setShopPhone(settings.shop_phone || "");
    setShopEmail(settings.shop_email || "");
    setSocial({
      instagram: { enabled: false, url: "", ...(settings.social_links?.instagram || {}) },
      facebook:  { enabled: false, url: "", ...(settings.social_links?.facebook  || {}) },
      tiktok:    { enabled: false, url: "", ...(settings.social_links?.tiktok    || {}) },
    });
  }, [settings.id]);

  const save = useMutation({
    mutationFn: (data) =>
      settings.id
        ? entities.ShopSettings.update(settings.id, data)
        : entities.ShopSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      toast.success("Booking page settings saved");
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `booking-logo/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(data.path);
      setLogoUrl(publicUrl);
      toast.success("Logo uploaded — click Save to apply");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    save.mutate({
      ...settings,
      max_booking_days_ahead: unitToDays(windowValue, windowUnit),
      booking_logo_url: logoUrl,
      shop_name:    shopName,
      shop_address: shopAddress,
      shop_phone:   shopPhone,
      shop_email:   shopEmail,
      social_links: social,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-[#8B9A7E]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Booking Page Settings</h2>
        <Button
          size="sm"
          className="h-8 bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-2"
          onClick={handleSave}
          disabled={save.isPending}
        >
          {save.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save
        </Button>
      </div>

      {/* ── Booking window ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking Window</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={windowValue}
            onChange={e => setWindowValue(e.target.value)}
            className="w-24"
          />
          <Select value={windowUnit} onValueChange={setWindowUnit}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
              <SelectItem value="months">Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-gray-400">
          How far out clients can book online. Currently set to {unitToDays(windowValue, windowUnit)} days.
        </p>
      </section>

      {/* ── Logo ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Shop Logo</h3>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Booking logo" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
              <Upload className="w-5 h-5 text-gray-300" />
            </div>
          )}
          <div>
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 transition-colors">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Uploading…" : "Upload Logo"}
              </div>
            </Label>
            <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
            <p className="text-xs text-gray-400 mt-1">Replaces the default logo on the /book page.</p>
          </div>
        </div>
      </section>

      {/* ── Shop info ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Shop Info</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs text-gray-500">Shop Name</Label>
            <Input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Stand Tall Barbershop" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-gray-500">Address</Label>
            <Input value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="123 Main St, City, ST 00000" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Phone</Label>
            <Input value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="(555) 000-0000" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Email</Label>
            <Input value={shopEmail} onChange={e => setShopEmail(e.target.value)} placeholder="info@shop.com" className="mt-1" />
          </div>
        </div>
      </section>

      {/* ── Social links ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Social Media</h3>
        <div className="space-y-3">
          {SOCIAL_PLATFORMS.map(({ key, label, Icon, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <Switch
                checked={social[key]?.enabled ?? false}
                onCheckedChange={v => setSocial(prev => ({ ...prev, [key]: { ...prev[key], enabled: v } }))}
              />
              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <Input
                value={social[key]?.url ?? ""}
                onChange={e => setSocial(prev => ({ ...prev, [key]: { ...prev[key], url: e.target.value } }))}
                placeholder={placeholder}
                disabled={!social[key]?.enabled}
                className="flex-1 text-sm"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">Enabled links will appear on the booking page footer.</p>
      </section>
    </div>
  );
}
