import { useState, useEffect, useRef, useCallback } from "react";
import {
  Megaphone, Tag, History, Settings, Mail, Plus, ChevronLeft,
  Send, Sparkles, Link2, Loader2, Users, FileText, TicketPercent,
  Eye, EyeOff, Check, Star, RefreshCw, CalendarDays, Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "campaigns",   label: "Campaigns",   icon: Megaphone },
  { id: "promo-codes", label: "Promo Codes",  icon: Tag },
  { id: "history",     label: "History",      icon: History },
  { id: "settings",    label: "Settings",     icon: Settings },
];

const SEGMENT_LABELS = {
  all:      "All clients",
  win_back: "Last visit > N days ago",
  no_visits: "No visits yet",
};

const DEFAULT_TEMPLATES = [
  {
    name: "We Miss You",
    subject: "We miss you — come back and see us!",
    body_html: `<p>Hey {{client_name}},</p>

<p>It's been a while since we've seen you at Stand Tall Barbershop, and we wanted to reach out.</p>

<p>We'd love to have you back in the chair. Book your next appointment whenever you're ready:</p>

<p>{{booking_link}}</p>

<p>See you soon,<br>The Stand Tall Team</p>`,
    segment_type: "win_back",
    segment_params: { days: 60 },
    type: "template",
    status: "template",
    channel: "email",
  },
  {
    name: "Leave Us a Review",
    subject: "Enjoying your cut? We'd love a review!",
    body_html: `<p>Hey {{client_name}},</p>

<p>Thank you for visiting Stand Tall Barbershop! We hope you're loving your fresh cut.</p>

<p>If you have a moment, leaving us a review means the world to a small business like ours. It only takes 30 seconds:</p>

<p>⭐ <strong>Leave us a Google review</strong> — <a href="{{google_review_link}}" style="color:#8B9A7E">Review on Google</a><br>
⭐ <strong>Leave us a Yelp review</strong> — <a href="{{yelp_review_link}}" style="color:#8B9A7E">Review on Yelp</a></p>

<p>Thank you so much for your support!</p>

<p>The Stand Tall Team</p>`,
    segment_type: "all",
    segment_params: {},
    type: "template",
    status: "template",
    channel: "email",
  },
  {
    name: "Win-Back 10% Off",
    subject: "We want you back — here's 10% off your next cut",
    body_html: `<p>Hey {{client_name}},</p>

<p>We've been thinking about you! It's been a while since your last visit, and we'd love to welcome you back to Stand Tall.</p>

<p>As a thank-you for being a valued client, here's 10% off your next appointment:</p>

<p>{{promo_code}}</p>

<p>Use this code when booking online or mention it at the front desk. It won't last forever — so book soon!</p>

<p>{{booking_link}}</p>

<p>Can't wait to see you,<br>The Stand Tall Team</p>`,
    segment_type: "win_back",
    segment_params: { days: 90 },
    type: "template",
    status: "template",
    channel: "email",
  },
  {
    name: "Happy Birthday",
    subject: "Happy Birthday from Stand Tall! 🎂",
    body_html: `<p>Hey {{client_name}},</p>

<p>Happy Birthday from all of us at Stand Tall Barbershop! 🎉</p>

<p>We hope your special day is amazing. There's no better way to celebrate than with a fresh cut — you deserve it.</p>

<p>Come see us this month and let's make your birthday look as good as you feel:</p>

<p>{{booking_link}}</p>

<p>Many happy returns,<br>The Stand Tall Team</p>`,
    segment_type: "birthday",
    segment_params: {},
    type: "template",
    status: "template",
    channel: "email",
  },
];

// ── Email preview renderer (mirrors edge function logic) ──────────────────────

function buildPreviewHtml({ bodyHtml, shopName, bookingUrl, promoCode }) {
  const name        = shopName || "Stand Tall Barbershop";
  const url         = bookingUrl || "#";
  const code        = promoCode || null;
  const sampleName  = "Jane Smith";

  const content = (bodyHtml || "")
    .replace(/\{\{client_name\}\}/g, sampleName)
    .replace(
      /\{\{booking_link\}\}/g,
      `<a href="${url}" style="display:inline-block;margin:8px 0;padding:12px 24px;background:#0A0A0A;color:#ffffff;text-decoration:none;border-radius:6px;font-family:Helvetica,sans-serif;font-size:14px;font-weight:600">Book Your Appointment →</a>`,
    )
    .replace(
      /\{\{promo_code\}\}/g,
      code
        ? `<span style="display:inline-block;padding:8px 16px;background:#F5F5F0;border:2px dashed #8B9A7E;border-radius:4px;font-family:monospace;font-size:18px;font-weight:700;letter-spacing:3px;color:#0A0A0A">${code}</span>`
        : '<span style="color:#999;font-style:italic">[promo code]</span>',
    )
    .replace(/\{\{google_review_link\}\}/g, "#")
    .replace(/\{\{yelp_review_link\}\}/g, "#");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:32px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:#0A0A0A;padding:24px 32px;text-align:center">
        <p style="margin:0;color:#8B9A7E;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px">${name}</p>
      </td></tr>
      <tr><td style="padding:32px;color:#333;font-size:14px;line-height:1.8">${content}</td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #F0F0F0;text-align:center">
        <p style="margin:0;font-size:10px;color:#aaa;font-family:Helvetica,sans-serif">
          You're receiving this as a client of ${name}. Reply "unsubscribe" to opt out.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EmptyTab({ icon: Icon, title, description, phase }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-sm mb-6 text-sm">{description}</p>
      <Badge variant="secondary">Coming in {phase}</Badge>
    </div>
  );
}

// ── Template picker ────────────────────────────────────────────────────────────

function TemplateGrid({ templates, onSelect, onBack }) {
  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="font-semibold">Choose a starting template</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
        {/* Blank option */}
        <button
          onClick={() => onSelect(null)}
          className="flex flex-col gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-[#8B9A7E] hover:bg-muted/30 text-left transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">Start blank</p>
          <p className="text-xs text-muted-foreground">Write from scratch</p>
        </button>

        {templates.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="flex flex-col gap-2 p-4 rounded-xl border border-border hover:border-[#8B9A7E] hover:bg-muted/30 text-left transition-all"
          >
            <div className="flex items-start justify-between">
              <p className="font-medium text-sm">{t.name}</p>
              <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                {SEGMENT_LABELS[t.segment_type] ?? t.segment_type}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 italic">{t.subject}</p>
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {t.body_html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Campaign editor ────────────────────────────────────────────────────────────

function CampaignEditor({ campaign, shop, promoCodes, templates, onBack, onSent }) {
  const [name, setName]               = useState(campaign?.name ?? "");
  const [subject, setSubject]         = useState(campaign?.subject ?? "");
  const [bodyHtml, setBodyHtml]       = useState(campaign?.body_html ?? "");
  const [segmentType, setSegmentType] = useState(campaign?.segment_type ?? "all");
  const [segmentDays, setSegmentDays] = useState(campaign?.segment_params?.days ?? 60);
  const [promoCodeId, setPromoCodeId] = useState(campaign?.segment_params?.promo_code_id ?? "");
  const [showPreview, setShowPreview] = useState(false); // mobile toggle
  const [aiLoading, setAiLoading]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [sending, setSending]         = useState(false);
  const [audienceCount, setAudienceCount] = useState(null);
  const [audienceLoading, setAudienceLoading] = useState(false);

  const textareaRef = useRef(null);

  const bookingUrl = shop?.url_slug
    ? `${window.location.origin}/book/${shop.url_slug}`
    : `${window.location.origin}/book`;

  const selectedPromoCode = promoCodes.find(p => p.id === promoCodeId);

  const previewHtml = buildPreviewHtml({
    bodyHtml,
    shopName:   shop?.name,
    bookingUrl,
    promoCode:  selectedPromoCode?.code,
  });

  // Estimate audience count
  const estimateAudience = useCallback(async () => {
    setAudienceLoading(true);
    setAudienceCount(null);
    try {
      const { count } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("marketing_email_opt_out", false)
        .not("email", "is", null)
        .neq("email", "");
      // win_back / no_visits require more complex queries — just show total opted-in for now
      setAudienceCount(count ?? 0);
    } catch {
      setAudienceCount(null);
    } finally {
      setAudienceLoading(false);
    }
  }, []);

  useEffect(() => { estimateAudience(); }, [estimateAudience]);

  function insertAtCursor(text) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const updated = bodyHtml.slice(0, start) + text + bodyHtml.slice(end);
    setBodyHtml(updated);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    });
  }

  async function handleAiDraft() {
    setAiLoading(true);
    try {
      const segmentDesc =
        segmentType === "win_back"  ? `clients who haven't visited in ${segmentDays}+ days` :
        segmentType === "no_visits" ? "clients who have never visited" :
        "all clients";

      const prompt =
        `Write a warm, friendly marketing email body for a barbershop campaign. ` +
        `Shop name: ${shop?.name ?? "Stand Tall Barbershop"}. ` +
        `Target audience: ${segmentDesc}. ` +
        `Tone: personal, welcoming, not salesy. ` +
        `Keep it concise (3-4 short paragraphs). ` +
        `Use {{client_name}} where the client's name should appear. ` +
        `Use {{booking_link}} where the booking button should appear. ` +
        (promoCodeId ? `Include {{promo_code}} to show the discount code. ` : "") +
        `Return only the email body as simple HTML paragraphs — no subject line, no full HTML document.`;

      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { message: prompt },
      });
      if (error) throw error;
      setBodyHtml(data?.reply ?? "");
    } catch (err) {
      toast.error("AI draft failed", { description: err?.message });
    } finally {
      setAiLoading(false);
    }
  }

  async function saveDraft() {
    if (!subject.trim()) { toast.error("Subject line is required"); return null; }
    setSaving(true);
    try {
      const payload = {
        name:           name.trim() || subject.trim().slice(0, 60),
        subject:        subject.trim(),
        body_html:      bodyHtml,
        segment_type:   segmentType,
        segment_params: {
          ...(segmentType === "win_back" ? { days: Number(segmentDays) } : {}),
          ...(promoCodeId ? { promo_code_id: promoCodeId } : {}),
        },
        status:  "draft",
        channel: "email",
        type:    "one_time",
        updated_at: new Date().toISOString(),
      };

      if (campaign?.id) {
        const { error } = await supabase
          .from("marketing_campaigns")
          .update(payload)
          .eq("id", campaign.id);
        if (error) throw error;
        toast.success("Draft saved");
        return campaign.id;
      } else {
        const { data, error } = await supabase
          .from("marketing_campaigns")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Draft saved");
        return data.id;
      }
    } catch (err) {
      toast.error("Failed to save draft", { description: err?.message });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!subject.trim()) { toast.error("Subject line is required"); return; }
    if (!bodyHtml.trim()) { toast.error("Email body is required"); return; }
    if (audienceCount === 0) { toast.error("No eligible recipients for this segment"); return; }

    const confirmed = window.confirm(
      `Send "${subject}" to all opted-in clients in the selected segment?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const campaignId = await saveDraft();
      if (!campaignId) { setSending(false); return; }

      const { data, error } = await supabase.functions.invoke("send-marketing-email", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;

      toast.success(`Campaign sent to ${data?.sent ?? 0} recipients${data?.failed ? ` (${data.failed} failed)` : ""}`);
      onSent();
    } catch (err) {
      toast.error("Send failed", { description: err?.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/20 flex-wrap gap-y-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          Campaigns
        </button>

        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Campaign name (internal)"
          className="flex-1 min-w-0 h-8 text-sm bg-transparent border-dashed"
        />

        {/* Mobile preview toggle */}
        <button
          onClick={() => setShowPreview(p => !p)}
          className="md:hidden flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground shrink-0"
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? "Edit" : "Preview"}
        </button>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving || sending}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save draft"}
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || saving}
            className="bg-[#8B9A7E] hover:bg-[#7a8970] text-white"
          >
            {sending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              : <Send className="w-3.5 h-3.5 mr-1.5" />}
            Send now
          </Button>
        </div>
      </div>

      {/* Editor body: compose (left) + preview (right) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Compose panel */}
        <div className={`flex flex-col gap-5 p-5 overflow-y-auto ${showPreview ? "hidden md:flex" : "flex"} flex-1 md:max-w-[55%] md:border-r md:border-border`}>

          {/* Audience */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audience</Label>
            <div className="flex gap-2 flex-wrap">
              <Select value={segmentType} onValueChange={v => { setSegmentType(v); }}>
                <SelectTrigger className="w-56 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  <SelectItem value="win_back">Last visit &gt; N days ago</SelectItem>
                  <SelectItem value="no_visits">No visits yet</SelectItem>
                </SelectContent>
              </Select>

              {segmentType === "win_back" && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={segmentDays}
                    onChange={e => setSegmentDays(Number(e.target.value))}
                    className="w-20 h-9 text-sm"
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">days</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {audienceLoading
                ? "Estimating audience…"
                : audienceCount !== null
                  ? `~${audienceCount} opted-in client${audienceCount !== 1 ? "s" : ""} with email${segmentType !== "all" ? " (final count applied at send)" : ""}`
                  : "—"}
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject line</Label>
            <Input
              id="subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. We miss you — come back and see us!"
              className="h-9"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email body</Label>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAiDraft}
                  disabled={aiLoading}
                  title="AI draft"
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-[#8B9A7E]/10 text-[#8B9A7E] hover:bg-[#8B9A7E]/20 transition-colors disabled:opacity-50"
                >
                  {aiLoading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Sparkles className="w-3 h-3" />}
                  AI draft
                </button>
                <button
                  onClick={() => insertAtCursor("{{booking_link}}")}
                  title="Insert booking link"
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Link2 className="w-3 h-3" />
                  Booking link
                </button>
                <div className="relative">
                  <Select
                    value={promoCodeId || "__none"}
                    onValueChange={v => setPromoCodeId(v === "__none" ? "" : v)}
                  >
                    <SelectTrigger className="h-7 text-xs px-2 gap-1 bg-muted border-0">
                      <TicketPercent className="w-3 h-3" />
                      <SelectValue placeholder="Promo code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No promo code</SelectItem>
                      {promoCodes.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} ({p.type === "percent" ? `${p.value}%` : `$${p.value}`} off)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {promoCodeId && (
              <button
                onClick={() => insertAtCursor("{{promo_code}}")}
                className="text-xs text-[#8B9A7E] hover:underline"
              >
                ↑ Click to insert promo code placeholder in body
              </button>
            )}

            <Textarea
              ref={textareaRef}
              value={bodyHtml}
              onChange={e => setBodyHtml(e.target.value)}
              placeholder={`Write your email here. Use HTML or plain text.\n\nAvailable placeholders:\n  {{client_name}} — recipient's name\n  {{booking_link}} — online booking button\n  {{promo_code}} — discount code (if selected above)`}
              className="min-h-[260px] font-mono text-sm resize-y"
            />
            <p className="text-[11px] text-muted-foreground">
              Supports HTML. Use toolbar buttons above to insert dynamic placeholders.
            </p>
          </div>
        </div>

        {/* Preview panel */}
        <div className={`flex-1 flex flex-col bg-muted/20 ${showPreview ? "flex" : "hidden md:flex"}`}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview — Jane Smith
            </span>
            {subject && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                Subject: {subject}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-3">
            <iframe
              srcDoc={previewHtml}
              className="w-full min-h-[500px] h-full rounded-lg border border-border bg-white"
              title="Email preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Campaign list ──────────────────────────────────────────────────────────────

function CampaignList({ campaigns, onNewCampaign, onShowTemplates }) {
  return (
    <div>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="font-semibold">Campaigns</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onShowTemplates}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Templates
          </Button>
          <Button size="sm" onClick={onNewCampaign} className="bg-[#8B9A7E] hover:bg-[#7a8970] text-white">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New campaign
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Send className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No campaigns yet</p>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">
            Start from a template or compose a new campaign to send to your clients.
          </p>
          <Button size="sm" onClick={onNewCampaign} className="bg-[#8B9A7E] hover:bg-[#7a8970] text-white">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New campaign
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {campaigns.map(c => (
            <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.name || c.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.subject}</p>
              </div>
              <div className="flex items-center gap-4 ml-4 shrink-0 text-right">
                <div>
                  <p className="text-sm font-medium">{c.recipient_count ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">sent</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {c.sent_at ? format(new Date(c.sent_at), "MMM d, yyyy") : "Draft"}
                  </p>
                </div>
                <Badge variant={c.status === "sent" ? "default" : "secondary"} className="text-[10px]">
                  {c.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── History tab ────────────────────────────────────────────────────────────────

function HistoryTab({ campaigns, campaignStats }) {
  const sent = campaigns.filter(c => c.status === "sent");

  if (sent.length === 0) {
    return (
      <EmptyTab
        icon={History}
        title="No send history yet"
        description="Once you send a campaign, it will appear here with open and click rates per send."
        phase="your first send"
      />
    );
  }

  function pct(count, total) {
    if (!total || total === 0) return "—";
    return `${Math.round((count / total) * 100)}%`;
  }

  return (
    <div>
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-semibold">Send history</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Open rates reflect email client image loading. Some clients block tracking pixels, so actual rates may be higher.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 dark:bg-muted/20 border-b border-border">
              <th className="text-left px-6 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Campaign</th>
              <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Segment</th>
              <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Sent</th>
              <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Opens</th>
              <th className="text-right px-6 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Clicks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sent.map(c => {
              const stats   = campaignStats[c.id] ?? { opens: 0, clicks: 0 };
              const openPct  = pct(stats.opens,  c.recipient_count);
              const clickPct = pct(stats.clicks, c.recipient_count);
              return (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium truncate max-w-[220px]">{c.name || c.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.sent_at ? format(new Date(c.sent_at), "MMM d, yyyy 'at' h:mm a") : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground text-xs whitespace-nowrap">
                    {SEGMENT_LABELS[c.segment_type] ?? c.segment_type}
                  </td>
                  <td className="px-4 py-4 text-right font-medium">{c.recipient_count ?? "—"}</td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium">{openPct}</span>
                    {stats.opens > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">({stats.opens})</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium">{clickPct}</span>
                    {stats.clicks > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">({stats.clicks})</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Marketing Settings tab ────────────────────────────────────────────────────

const DEFAULT_MS = {
  review_request_enabled:       false,
  review_request_after_visits:  3,
  google_review_enabled:        false,
  google_review_url:            "",
  yelp_review_enabled:          false,
  yelp_review_url:              "",
  winback_enabled:              false,
  winback_days:                 60,
  winback_template_id:          "",
  winback_promo_code_id:        "",
  birthday_enabled:             false,
  birthday_template_id:         "",
};

function MarketingSettingsTab({ shopSettings, templates, promoCodes, onSaved }) {
  const [form, setForm]       = useState({ ...DEFAULT_MS, ...(shopSettings?.marketing_settings ?? {}) });
  const [saving, setSaving]   = useState(false);
  const [running, setRunning] = useState({ review: false, winback: false, birthday: false });

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function save() {
    if (!shopSettings?.id) { toast.error("Could not locate shop settings row"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("shop_settings")
        .update({ marketing_settings: form })
        .eq("id", shopSettings.id);
      if (error) throw error;
      toast.success("Settings saved");
      onSaved?.();
    } catch (err) {
      toast.error("Failed to save settings", { description: err?.message });
    } finally {
      setSaving(false);
    }
  }

  async function runNow(type) {
    setRunning(r => ({ ...r, [type]: true }));
    const fnMap = { review: "automation-review-request", winback: "automation-winback", birthday: "automation-birthday" };
    try {
      const { data, error } = await supabase.functions.invoke(fnMap[type], { body: {} });
      if (error) throw error;
      if (data?.skipped) toast.info(`Automation skipped: ${data.skipped}`);
      else toast.success(`Ran: ${data?.sent ?? 0} email${data?.sent !== 1 ? "s" : ""} sent${data?.failed ? `, ${data.failed} failed` : ""}`);
    } catch (err) {
      toast.error(`Failed to run ${type} automation`, { description: err?.message });
    } finally {
      setRunning(r => ({ ...r, [type]: false }));
    }
  }

  const winbackTemplates  = templates.filter(t => t.segment_type === "win_back");
  const birthdayTemplates = templates.filter(t => t.segment_type === "birthday" || t.name?.toLowerCase().includes("birthday"));

  return (
    <div className="p-6 max-w-2xl space-y-8">

      {/* ── Review Request ── */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Star className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold">Review Request</h3>
            </div>
            <p className="text-sm text-muted-foreground">Send a one-time review request after a client's Nth visit. Fires once per client, ever.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => runNow("review")} disabled={running.review}>
              {running.review ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Run now
            </Button>
            <Switch checked={!!form.review_request_enabled} onCheckedChange={v => set("review_request_enabled", v)} className="data-[state=checked]:bg-[#8B9A7E]" />
          </div>
        </div>

        {form.review_request_enabled && (
          <div className="pl-6 space-y-4 border-l-2 border-[#8B9A7E]/30">
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Send after</Label>
              <Input type="number" value={form.review_request_after_visits} onChange={e => set("review_request_after_visits", Number(e.target.value))} className="w-20 h-8" min={1} max={20} />
              <span className="text-sm text-muted-foreground">completed visits</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={!!form.google_review_enabled} onCheckedChange={v => set("google_review_enabled", v)} className="data-[state=checked]:bg-[#8B9A7E]" />
                <Label className="text-sm">Google Reviews</Label>
              </div>
              {form.google_review_enabled && (
                <Input value={form.google_review_url} onChange={e => set("google_review_url", e.target.value)} placeholder="https://g.page/r/your-business/review" className="h-8 text-sm" />
              )}

              <div className="flex items-center gap-3">
                <Switch checked={!!form.yelp_review_enabled} onCheckedChange={v => set("yelp_review_enabled", v)} className="data-[state=checked]:bg-[#8B9A7E]" />
                <Label className="text-sm">Yelp Reviews</Label>
              </div>
              {form.yelp_review_enabled && (
                <Input value={form.yelp_review_url} onChange={e => set("yelp_review_url", e.target.value)} placeholder="https://www.yelp.com/writeareview/biz/..." className="h-8 text-sm" />
              )}
            </div>
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* ── Win-Back ── */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold">Win-Back</h3>
            </div>
            <p className="text-sm text-muted-foreground">Daily: email clients whose last completed visit was exactly N days ago.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => runNow("winback")} disabled={running.winback}>
              {running.winback ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Run now
            </Button>
            <Switch checked={!!form.winback_enabled} onCheckedChange={v => set("winback_enabled", v)} className="data-[state=checked]:bg-[#8B9A7E]" />
          </div>
        </div>

        {form.winback_enabled && (
          <div className="pl-6 space-y-4 border-l-2 border-[#8B9A7E]/30">
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Days since last visit</Label>
              <Input type="number" value={form.winback_days} onChange={e => set("winback_days", Number(e.target.value))} className="w-24 h-8" min={7} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Template</Label>
              <Select value={form.winback_template_id || "__default"} onValueChange={v => set("winback_template_id", v === "__default" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Use default win-back template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default">Default (built-in)</SelectItem>
                  {winbackTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {promoCodes.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">Promo code to include</Label>
                <Select value={form.winback_promo_code_id || "__none"} onValueChange={v => set("winback_promo_code_id", v === "__none" ? "" : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {promoCodes.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.code} ({p.type === "percent" ? `${p.value}%` : `$${p.value}`} off)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Template must include {"{{"+"promo_code"+"}}"} placeholder.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* ── Birthday ── */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CalendarDays className="w-4 h-4 text-pink-500" />
              <h3 className="font-semibold">Birthday</h3>
            </div>
            <p className="text-sm text-muted-foreground">Daily: send a birthday email to clients whose birthday is today. Once per calendar year per client.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => runNow("birthday")} disabled={running.birthday}>
              {running.birthday ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Run now
            </Button>
            <Switch checked={!!form.birthday_enabled} onCheckedChange={v => set("birthday_enabled", v)} className="data-[state=checked]:bg-[#8B9A7E]" />
          </div>
        </div>

        {form.birthday_enabled && (
          <div className="pl-6 space-y-4 border-l-2 border-[#8B9A7E]/30">
            <p className="text-sm text-muted-foreground">
              Client birthdates are set per client in the Clients tab. The default "Happy Birthday" template is used unless you select a custom one.
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm">Template</Label>
              <Select value={form.birthday_template_id || "__default"} onValueChange={v => set("birthday_template_id", v === "__default" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Use default birthday template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default">Default (built-in)</SelectItem>
                  {birthdayTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* ── Scheduling info ── */}
      <section className="flex gap-3 p-4 rounded-xl bg-muted/40 border border-border">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Daily scheduling is set up via pg_cron</p>
          <p>Each automation runs daily at <strong>10 AM US Eastern (14:00 UTC)</strong>. Use the <strong>Run now</strong> buttons above to trigger any automation immediately for testing.</p>
          <p>One-time setup — run this once in <strong>Dashboard → SQL Editor</strong> to store your service role key in Supabase Vault:</p>
          <code className="block font-mono text-xs bg-muted px-3 py-2 rounded border border-border whitespace-pre">
            {"SELECT vault.create_secret(\n  'eyJ...',  -- your service_role JWT\n  'marketing_service_role_key'\n);"}
          </code>
          <p>Find your key at <strong>Project Settings → API → service_role</strong> (the long <code className="font-mono text-xs">eyJ…</code> token). The key is stored encrypted and is not visible in plaintext after this step.</p>
          <p>Verify jobs are active: <code className="font-mono text-xs">SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'automation-%';</code></p>
        </div>
      </section>

      <Button onClick={save} disabled={saving} className="bg-[#8B9A7E] hover:bg-[#7a8970] text-white">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save settings
      </Button>
    </div>
  );
}

// ── Main Marketing page ────────────────────────────────────────────────────────

export default function Marketing() {
  const [activeTab, setActiveTab]         = useState("campaigns");
  const [view, setView]                   = useState("list"); // 'list' | 'templates' | 'editor'
  const [editCampaign, setEditCampaign]   = useState(null); // campaign being edited
  const [campaigns, setCampaigns]         = useState([]);
  const [templates, setTemplates]         = useState([]);
  const [promoCodes, setPromoCodes]       = useState([]);
  const [shopSettings, setShopSettings]   = useState(null);
  const [shop, setShop]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [campaignStats, setCampaignStats] = useState({}); // campaign_id -> { opens, clicks }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [shopRes, campaignRes, promoRes, settingsRes] = await Promise.all([
        supabase.from("shops").select("id, name, url_slug").limit(1).single(),
        supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("promo_codes").select("id, code, type, value").eq("active", true).order("code"),
        supabase.from("shop_settings").select("id, marketing_settings").limit(1).single(),
      ]);

      if (shopRes.data)      setShop(shopRes.data);
      if (promoRes.data)     setPromoCodes(promoRes.data);
      if (settingsRes.data)  setShopSettings(settingsRes.data);

      const allCampaigns = campaignRes.data ?? [];
      setTemplates(allCampaigns.filter(c => c.status === "template"));
      const nonTemplates = allCampaigns.filter(c => c.status !== "template");
      setCampaigns(nonTemplates);

      // Fetch open/click stats for sent campaigns
      const sentIds = nonTemplates.filter(c => c.status === "sent").map(c => c.id);
      if (sentIds.length > 0) {
        const { data: sends } = await supabase
          .from("campaign_sends")
          .select("campaign_id, opened_at, clicked_at")
          .in("campaign_id", sentIds);

        const stats = {};
        for (const s of sends ?? []) {
          if (!stats[s.campaign_id]) stats[s.campaign_id] = { opens: 0, clicks: 0 };
          if (s.opened_at)  stats[s.campaign_id].opens++;
          if (s.clicked_at) stats[s.campaign_id].clicks++;
        }
        setCampaignStats(stats);
      }

      // Seed default templates if shop has none yet
      const shopId = shopRes.data?.id;
      if (shopId && allCampaigns.filter(c => c.status === "template").length === 0) {
        const seeded = await Promise.all(
          DEFAULT_TEMPLATES.map(t =>
            supabase.from("marketing_campaigns").insert({ ...t, shop_id: shopId }).select("*").single()
          )
        );
        setTemplates(seeded.map(r => r.data).filter(Boolean));
      }
    } catch (err) {
      toast.error("Failed to load marketing data", { description: err?.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleSelectTemplate(template) {
    if (template) {
      setEditCampaign({
        ...template,
        id:     undefined, // new campaign from template
        status: "draft",
        type:   "one_time",
        name:   "",
      });
    } else {
      setEditCampaign({ name: "", subject: "", body_html: "", segment_type: "all", segment_params: {} });
    }
    setView("editor");
  }

  function handleSent() {
    loadData();
    setView("list");
    setEditCampaign(null);
    setActiveTab("history");
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#B0BFA4]/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[#8B9A7E]" />
          </div>
          <h1 className="text-2xl font-bold">Marketing</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Campaigns, automations, and promo codes for {shop?.name ?? "Stand Tall Barbershop"}
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-muted/40 p-1 rounded-xl w-fit">
        {TABS.map(tab => {
          const Icon     = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "campaigns") setView("list"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading && activeTab !== "campaigns" ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {activeTab === "campaigns" && (
              <>
                {view === "list" && (
                  <CampaignList
                    campaigns={campaigns}
                    onNewCampaign={() => setView("templates")}
                    onShowTemplates={() => setView("templates")}
                  />
                )}
                {view === "templates" && (
                  <TemplateGrid
                    templates={templates}
                    onSelect={handleSelectTemplate}
                    onBack={() => setView("list")}
                  />
                )}
                {view === "editor" && (
                  <CampaignEditor
                    campaign={editCampaign}
                    shop={shop}
                    promoCodes={promoCodes}
                    templates={templates}
                    onBack={() => setView("list")}
                    onSent={handleSent}
                  />
                )}
              </>
            )}

            {activeTab === "promo-codes" && (
              <EmptyTab
                icon={Tag}
                title="Promo Codes"
                description="Create fixed or percentage discount codes. Apply at checkout or let clients enter them on the booking page."
                phase="Phase 5"
              />
            )}

            {activeTab === "history" && (
              <HistoryTab campaigns={campaigns} campaignStats={campaignStats} />
            )}

            {activeTab === "settings" && (
              <MarketingSettingsTab
                shopSettings={shopSettings}
                templates={templates}
                promoCodes={promoCodes}
                onSaved={loadData}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
