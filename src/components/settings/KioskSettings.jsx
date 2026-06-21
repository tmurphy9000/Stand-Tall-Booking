import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { entities } from "@/api/entities";
import { supabase } from "@/lib/supabaseClient";
import { usePermissions } from "../permissions/usePermissions";
import AccessDenied from "./AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink, RefreshCw, Tablet, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function KioskSettings() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: settingsArr = [], isLoading } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => entities.ShopSettings.list(),
  });
  const settings = settingsArr[0] || {};

  const kioskToken = settings.kiosk_token;
  const kioskUrl = kioskToken
    ? `${window.location.origin}/checkin/${kioskToken}`
    : null;

  if (!hasPermission('settings.general', 'modify')) return <AccessDenied />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const handleCopy = () => {
    if (!kioskUrl) return;
    navigator.clipboard.writeText(kioskUrl).then(() => {
      setCopied(true);
      toast.success("Kiosk link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGenerateToken = async () => {
    if (!settings.id) return;
    const newToken = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase
      .from("shop_settings")
      .update({ kiosk_token: newToken })
      .eq("id", settings.id);
    if (error) {
      toast.error("Failed to generate kiosk link: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      toast.success("Kiosk link generated.");
    }
  };

  const handleRegenerate = async () => {
    if (!settings.id) return;
    setRegenerating(true);
    const newToken = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase
      .from("shop_settings")
      .update({ kiosk_token: newToken })
      .eq("id", settings.id);
    setRegenerating(false);
    if (error) {
      toast.error("Failed to regenerate token: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      setShowWarning(false);
      toast.success("Kiosk link regenerated. The old link is now invalid.");
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-2">
        <Tablet className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold">Check-In Kiosk</h3>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Place a tablet or display at your front desk so clients can check in when they arrive — no staff intervention needed.
        The kiosk shows today's appointments and lets each client tap their name.
      </p>

      {!kioskToken ? (
        <Button size="sm" onClick={handleGenerateToken} className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white">
          Generate Kiosk Link
        </Button>
      ) : (
        <div className="space-y-4">
          {/* URL display */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Kiosk URL</Label>
            <div className="flex gap-2">
              <Input
                value={kioskUrl}
                readOnly
                className="font-mono text-xs text-gray-600 bg-gray-50"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 gap-1 h-9"
              >
                {copied ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs"
              onClick={() => window.open(kioskUrl, "_blank", "noopener")}
            >
              <ExternalLink className="w-3 h-3" />
              Open Kiosk
            </Button>
          </div>

          {/* Regenerate */}
          {!showWarning ? (
            <button
              onClick={() => setShowWarning(true)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate link
            </button>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Regenerating will immediately invalidate the current link. Any device using the old URL will show an error until it's updated with the new link.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  {regenerating && <Loader2 className="w-3 h-3 animate-spin" />}
                  Yes, regenerate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setShowWarning(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Usage note */}
          <p className="text-[10px] text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
            Open this URL on any tablet or touchscreen browser and leave it running. No login required — access is controlled by the unique token in the URL.
          </p>
        </div>
      )}
    </div>
  );
}
