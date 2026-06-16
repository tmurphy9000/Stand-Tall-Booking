import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useShop } from "@/lib/shopContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PaymentsSettings() {
  const { shopId, isLoading: shopLoading } = useShop();
  const [shop, setShop] = useState(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();

  const loadShopData = () => {
    if (!shopId) return;
    supabase
      .from("shops")
      .select("stripe_account_id, stripe_connect_status, deposits_enabled, deposit_amount")
      .eq("id", shopId)
      .single()
      .then(({ data }) => {
        setShop(data);
        setLoadingShop(false);
      });
  };

  useEffect(() => {
    if (shopId) loadShopData();
  }, [shopId]);

  useEffect(() => {
    if (searchParams.get("connected") === "true" && shopId) {
      loadShopData();
      toast.success("Stripe account connected!");
    }
  }, [searchParams, shopId]);

  const connectStripe = () => {
    const clientId = import.meta.env.VITE_STRIPE_CONNECT_CLIENT_ID;
    if (!clientId) {
      toast.error("Stripe Connect is not configured (missing VITE_STRIPE_CONNECT_CLIENT_ID).");
      return;
    }
    const redirectUri = encodeURIComponent("https://standtallbooking.com/stripe/callback");
    window.location.href = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}`;
  };

  const disconnectStripe = async () => {
    if (!window.confirm("Disconnect your Stripe account? Card payments will stop working until you reconnect.")) return;
    setSaving(true);
    const { error } = await supabase
      .from("shops")
      .update({ stripe_account_id: null, stripe_connect_status: "not_connected" })
      .eq("id", shopId);
    setSaving(false);
    if (error) { toast.error("Failed to disconnect: " + error.message); return; }
    setShop((prev) => ({ ...prev, stripe_account_id: null, stripe_connect_status: "not_connected" }));
    toast.success("Stripe account disconnected.");
  };

  const saveDepositSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("shops")
      .update({
        deposits_enabled: shop.deposits_enabled,
        deposit_amount: shop.deposit_amount,
      })
      .eq("id", shopId);
    setSaving(false);
    if (error) { toast.error("Failed to save: " + error.message); return; }
    toast.success("Deposit settings saved.");
  };

  if (shopLoading || loadingShop) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-[#8B9A7E]" />
      </div>
    );
  }

  const isConnected = !!shop?.stripe_account_id;

  return (
    <div className="space-y-8 max-w-lg">
      {/* Stripe Connect section */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Stripe Connect</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Connect your Stripe account so card payments go directly to you.
          </p>
        </div>

        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            isConnected ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
          }`}
        >
          {isConnected ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {isConnected ? "Stripe account connected" : "No Stripe account connected"}
            </p>
            {isConnected ? (
              <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                {shop.stripe_account_id}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                Connect to enable card payments at checkout and online deposits.
              </p>
            )}
          </div>
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
              onClick={disconnectStripe}
              disabled={saving}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs h-8 bg-[#635BFF] hover:bg-[#4B44D8] text-white flex-shrink-0"
              onClick={connectStripe}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Connect Stripe
            </Button>
          )}
        </div>

        {!isConnected && (
          <p className="text-[11px] text-gray-400 leading-relaxed">
            You'll be redirected to Stripe to authorize the connection. Your clients' card payments and online deposits will flow directly into your Stripe account.
          </p>
        )}
      </section>

      {/* Deposit settings — only shown once Stripe is connected */}
      {isConnected && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Online Deposits</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Require a deposit when clients book online. Charged immediately at booking.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Require deposit</Label>
              <p className="text-xs text-gray-500">
                {shop?.deposits_enabled
                  ? "Clients pay a deposit when booking online"
                  : "No deposit required at booking"}
              </p>
            </div>
            <Switch
              checked={!!shop?.deposits_enabled}
              onCheckedChange={(v) => setShop((prev) => ({ ...prev, deposits_enabled: v }))}
            />
          </div>

          {shop?.deposits_enabled && (
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Deposit amount ($)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                className="max-w-[160px]"
                value={Math.round((shop.deposit_amount ?? 2000) / 100)}
                onChange={(e) =>
                  setShop((prev) => ({
                    ...prev,
                    deposit_amount: Math.max(1, Math.round(parseFloat(e.target.value) || 20)) * 100,
                  }))
                }
              />
              <p className="text-[10px] text-gray-400">
                Amount charged at the time of booking. Non-refundable per your cancellation policy.
              </p>
            </div>
          )}

          <Button
            size="sm"
            className="h-8 bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-1.5"
            disabled={saving}
            onClick={saveDepositSettings}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save deposit settings
          </Button>
        </section>
      )}
    </div>
  );
}
