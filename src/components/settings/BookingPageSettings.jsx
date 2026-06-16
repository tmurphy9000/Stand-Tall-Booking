import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useShop } from "@/lib/shopContext";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Instagram, Facebook, Globe, Phone, Mail, Copy, CheckCircle2, ExternalLink, Code } from "lucide-react";

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

function parseSocialLinks(raw) {
  if (!raw) return {};
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}

const BASE_URL = "https://standtallbooking.com";

function SlugEditor({ shopId, currentSlug, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentSlug);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!cleaned || cleaned === currentSlug) { setEditing(false); return; }
    setSaving(true);
    const { error } = await supabase.from("shops").update({ url_slug: cleaned }).eq("id", shopId);
    setSaving(false);
    if (error) { toast.error("Slug already taken or invalid: " + error.message); return; }
    onSaved(cleaned);
    setEditing(false);
    toast.success("Booking URL updated.");
  };

  if (!editing) {
    return (
      <button onClick={() => { setValue(currentSlug); setEditing(true); }} className="text-xs text-[#8B9A7E] hover:underline">
        Customize URL slug
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 flex-shrink-0">{BASE_URL}/book/</span>
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        className="h-7 text-xs font-mono flex-1"
        autoFocus
        onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
      />
      <Button size="sm" className="h-7 text-xs bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
    </div>
  );
}

function CopySnippet({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 text-[11px] p-3 rounded-lg overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">{value}</pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors"
        style={{ background: copied ? "#22c55e20" : "#ffffff20", color: copied ? "#86efac" : "#9ca3af" }}
      >
        {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}

export default function BookingPageSettings() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();
  const [urlSlug, setUrlSlug] = useState("");

  const { data: settingsArr = [], isLoading } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => entities.ShopSettings.list(),
  });
  const settings = settingsArr[0] || {};

  const [windowValue, setWindowValue] = useState(60);
  const [windowUnit, setWindowUnit]   = useState("days");
  const [logoUrl, setLogoUrl]         = useState("");
  const [uploading, setUploading]     = useState(false);
  const [shopName, setShopName]       = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone]     = useState("");
  const [showPhone, setShowPhone]     = useState(true);
  const [shopEmail, setShopEmail]     = useState("");
  const [showEmail, setShowEmail]     = useState(true);
  const [social, setSocial]           = useState({
    instagram: { enabled: false, url: "" },
    facebook:  { enabled: false, url: "" },
    tiktok:    { enabled: false, url: "" },
  });
  const [cancelPolicyEnabled, setCancelPolicyEnabled] = useState(false);
  const [cancelPolicyText, setCancelPolicyText]       = useState("");
  const [minNotice, setMinNotice]                     = useState(0);
  const [scheduleOptimizerEnabled, setScheduleOptimizerEnabled] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    supabase.from("shops").select("url_slug").eq("id", shopId).single()
      .then(({ data }) => { if (data?.url_slug) setUrlSlug(data.url_slug); });
  }, [shopId]);

  useEffect(() => {
    if (!settings.id) return;
    const { value, unit } = daysToUnit(settings.max_booking_days_ahead ?? 60);
    setWindowValue(value);
    setWindowUnit(unit);
    setLogoUrl(settings.booking_logo_url || "");
    setShopName(settings.shop_name || "");
    setShopAddress(settings.shop_address || "");
    setShopPhone(settings.shop_phone || "");
    setShowPhone(settings.show_shop_phone !== false);
    setShopEmail(settings.shop_email || "");
    setShowEmail(settings.show_shop_email !== false);
    const links = parseSocialLinks(settings.social_links);
    setSocial({
      instagram: { enabled: false, url: "", ...(links.instagram || {}) },
      facebook:  { enabled: false, url: "", ...(links.facebook  || {}) },
      tiktok:    { enabled: false, url: "", ...(links.tiktok    || {}) },
    });
    setCancelPolicyEnabled(settings.cancellation_policy_enabled === true);
    setCancelPolicyText(settings.cancellation_policy_text || "");
    setMinNotice(settings.min_booking_notice_minutes ?? 0);
    setScheduleOptimizerEnabled(settings.schedule_optimizer_enabled !== false);
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

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large — max 2 MB");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `booking-logo/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (error) {
        console.error("Logo upload error:", error);
        if (error.message?.includes("Bucket not found")) {
          toast.error('Upload failed: "photos" bucket not found. Create it in Supabase Storage and enable public access.');
        } else if (error.message?.includes("not authorized") || error.statusCode === 403) {
          toast.error("Upload failed: storage bucket is not public. Enable public access in Supabase Storage → photos → Policies.");
        } else {
          toast.error("Upload failed: " + error.message);
        }
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(data.path);
      setLogoUrl(publicUrl);
      toast.success("Logo uploaded — click Save to apply");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = () => {
    save.mutate({
      ...settings,
      max_booking_days_ahead: unitToDays(windowValue, windowUnit),
      booking_logo_url: logoUrl || null,
      shop_name:       shopName,
      shop_address:    shopAddress,
      shop_phone:      shopPhone,
      show_shop_phone: showPhone,
      shop_email:      shopEmail,
      show_shop_email:             showEmail,
      social_links:                social,
      cancellation_policy_enabled:  cancelPolicyEnabled,
      cancellation_policy_text:     cancelPolicyText || null,
      min_booking_notice_minutes:   Number(minNotice) || 0,
      schedule_optimizer_enabled:   scheduleOptimizerEnabled,
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

      {/* ── Booking URL ── */}
      {urlSlug && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Booking URL</h3>
          <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm font-mono flex-1 truncate text-gray-700">
              {BASE_URL}/book/{urlSlug}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 flex-shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(`${BASE_URL}/book/${urlSlug}`);
                toast.success("Booking URL copied!");
              }}
            >
              <Copy className="w-3 h-3" /> Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 flex-shrink-0"
              onClick={() => window.open(`${BASE_URL}/book/${urlSlug}`, "_blank")}
            >
              <ExternalLink className="w-3 h-3" /> Open
            </Button>
          </div>
          <SlugEditor shopId={shopId} currentSlug={urlSlug} onSaved={setUrlSlug} />
        </section>
      )}

      {/* ── Embed on Your Website ── */}
      {urlSlug && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Code className="w-3.5 h-3.5 text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Embed on Your Website</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 font-medium">Option A — iFrame</p>
              <CopySnippet
                label="Copy"
                value={`<iframe src="${BASE_URL}/book/${urlSlug}?embed=true" width="100%" height="700" frameborder="0" style="border-radius:12px;"></iframe>`}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 font-medium">Option B — Script tag</p>
              <CopySnippet
                label="Copy"
                value={`<script src="${BASE_URL}/embed.js" data-shop="${urlSlug}"></script>`}
              />
            </div>
            <p className="text-[10px] text-gray-400">
              Paste either snippet into your website's HTML where you want the booking form to appear.
            </p>
          </div>
        </section>
      )}

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
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
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

      {/* ── Schedule optimizer ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule Optimizer</h3>
          <Switch checked={scheduleOptimizerEnabled} onCheckedChange={setScheduleOptimizerEnabled} />
        </div>
        <p className="text-xs text-gray-400">
          Automatically minimizes gaps and balances bookings across your team.
        </p>
      </section>

      {/* ── Minimum booking notice ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Minimum Booking Notice</h3>
        <Select value={String(minNotice)} onValueChange={v => setMinNotice(Number(v))}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">No restriction</SelectItem>
            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(m => (
              <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-400">
          Clients cannot book a slot starting within this many minutes from now.
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
            <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
            <p className="text-xs text-gray-400 mt-1">Replaces the default logo on the /book page.</p>
            <p className="text-xs text-gray-300 mt-0.5">Recommended: 200×200px · PNG or JPG · max 2 MB</p>
          </div>
        </div>
      </section>

      {/* ── Shop info ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Shop Info</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500">Shop Name</Label>
            <Input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Stand Tall Barbershop" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Address</Label>
            <Input value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="123 Main St, City, ST 00000" className="mt-1" />
          </div>
          {/* Phone with visibility toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={showPhone} onCheckedChange={setShowPhone} />
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Input
              value={shopPhone}
              onChange={e => setShopPhone(e.target.value)}
              placeholder="(555) 000-0000"
              disabled={!showPhone}
              className="flex-1 text-sm"
            />
          </div>
          {/* Email with visibility toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={showEmail} onCheckedChange={setShowEmail} />
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Input
              value={shopEmail}
              onChange={e => setShopEmail(e.target.value)}
              placeholder="info@shop.com"
              disabled={!showEmail}
              className="flex-1 text-sm"
            />
          </div>
          <p className="text-xs text-gray-400">Toggle to show or hide phone and email on the booking success screen.</p>
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
        <p className="text-xs text-gray-400">Enabled links appear on the booking page welcome screen.</p>
      </section>

      {/* ── Cancellation policy ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cancellation Policy</h3>
          <Switch checked={cancelPolicyEnabled} onCheckedChange={setCancelPolicyEnabled} />
        </div>
        {cancelPolicyEnabled && (
          <div className="space-y-2">
            <Textarea
              value={cancelPolicyText}
              onChange={e => setCancelPolicyText(e.target.value)}
              placeholder="e.g. We require at least 24 hours notice for cancellations. Late cancellations may result in a fee."
              rows={4}
              className="text-sm resize-none"
            />
            <p className="text-xs text-gray-400">
              Clients will be shown this text on the confirmation step and must check a box before booking.
            </p>
          </div>
        )}
      </section>

      {/* ── Bottom save ── */}
      <div className="flex justify-end pt-2 border-t border-gray-100">
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
    </div>
  );
}
