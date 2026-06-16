import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useShop } from "@/lib/shopContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, AlertCircle, ExternalLink, Loader2, MapPin, Tablet, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PaymentsSettings() {
  const { shopId, isLoading: shopLoading } = useShop();
  const [shop, setShop] = useState(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [searchParams] = useSearchParams();
  const [depositConfig, setDepositConfig] = useState({
    _id: null,
    deposit_enabled: false,
    deposit_percentage: 20,
    deposit_refund_hours: 24,
    deposit_pretip_enabled: false,
  });

  // Card Readers state
  const [readers, setReaders] = useState([]);
  const [readersLoading, setReadersLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regCode, setRegCode] = useState('');
  const [regLabel, setRegLabel] = useState('');
  const [registerSaving, setRegisterSaving] = useState(false);

  const loadShopData = async () => {
    if (!shopId) return;
    const [{ data: shopData }, { data: settingsRows }] = await Promise.all([
      supabase
        .from("shops")
        .select("stripe_account_id, stripe_connect_status, stripe_terminal_location_id")
        .eq("id", shopId)
        .single(),
      supabase
        .from("shop_settings")
        .select("id, deposit_enabled, deposit_percentage, deposit_refund_hours, deposit_pretip_enabled")
        .eq("shop_id", shopId)
        .limit(1),
    ]);
    setShop(shopData);
    if (settingsRows?.[0]) {
      const s = settingsRows[0];
      setDepositConfig({
        _id: s.id,
        deposit_enabled: s.deposit_enabled ?? false,
        deposit_percentage: s.deposit_percentage ?? 20,
        deposit_refund_hours: s.deposit_refund_hours ?? 24,
        deposit_pretip_enabled: s.deposit_pretip_enabled ?? false,
      });
    }
    setLoadingShop(false);
    return shopData;
  };

  const loadReaders = async (locationId) => {
    if (!shopId || !locationId) return;
    setReadersLoading(true);
    const { data, error } = await supabase.functions.invoke('stripe-list-readers', {
      body: { shopId },
    });
    setReadersLoading(false);
    if (error || data?.error) {
      toast.error("Failed to load readers: " + (error?.message || data?.error));
      return;
    }
    setReaders(data?.readers ?? []);
  };

  useEffect(() => {
    if (shopId) {
      loadShopData().then(data => {
        if (data?.stripe_terminal_location_id) {
          loadReaders(data.stripe_terminal_location_id);
        }
      });
    }
  }, [shopId]);

  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (!shopId) return;
    if (stripeParam === "success") {
      supabase.functions.invoke("stripe-connect-status", { body: { shopId } })
        .then(({ data, error }) => {
          if (error || data?.error) {
            toast.error("Failed to verify Stripe connection: " + (error?.message || data?.error));
          } else {
            loadShopData();
            toast.success("Stripe account connected!");
          }
        });
    } else if (stripeParam === "refresh") {
      toast.info("Stripe session expired. Click Connect Stripe to try again.");
    }
  }, [searchParams, shopId]);

  const connectStripe = async () => {
    if (!shopId) return;
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
      body: { shopId },
    });
    setConnecting(false);
    if (error || data?.error) {
      toast.error("Failed to start Stripe onboarding: " + (error?.message || data?.error));
      return;
    }
    window.location.href = data.url;
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
    const payload = {
      deposit_enabled: depositConfig.deposit_enabled,
      deposit_percentage: depositConfig.deposit_percentage,
      deposit_refund_hours: depositConfig.deposit_refund_hours,
      deposit_pretip_enabled: depositConfig.deposit_pretip_enabled,
    };
    let error;
    if (depositConfig._id) {
      ({ error } = await supabase.from("shop_settings").update(payload).eq("id", depositConfig._id));
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("shop_settings")
        .insert({ shop_id: shopId, ...payload })
        .select("id")
        .single();
      error = insertErr;
      if (inserted) setDepositConfig(p => ({ ...p, _id: inserted.id }));
    }
    setSaving(false);
    if (error) { toast.error("Failed to save: " + error.message); return; }
    toast.success("Deposit settings saved.");
  };

  const setupTerminalLocation = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('stripe-terminal-location', {
      body: { shopId },
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error("Failed to set up terminal location: " + (error?.message || data?.error));
      return;
    }
    const locationId = data?.locationId;
    setShop((prev) => ({ ...prev, stripe_terminal_location_id: locationId }));
    toast.success("Terminal location created.");
    loadReaders(locationId);
  };

  const registerReader = async () => {
    if (!regCode.trim()) return;
    setRegisterSaving(true);
    const { data, error } = await supabase.functions.invoke('stripe-register-reader', {
      body: { shopId, code: regCode.trim(), label: regLabel.trim() || undefined },
    });
    setRegisterSaving(false);
    if (error || data?.error) {
      toast.error("Failed to register reader: " + (error?.message || data?.error));
      return;
    }
    toast.success("Reader registered successfully.");
    setRegCode('');
    setRegLabel('');
    setShowRegisterForm(false);
    loadReaders(shop?.stripe_terminal_location_id);
  };

  const deleteReader = async (readerId) => {
    if (!window.confirm("Remove this reader?")) return;
    const { data, error } = await supabase.functions.invoke('stripe-delete-reader', {
      body: { shopId, readerId },
    });
    if (error || data?.error) {
      toast.error("Failed to remove reader: " + (error?.message || data?.error));
      return;
    }
    toast.success("Reader removed.");
    setReaders((prev) => prev.filter((r) => r.id !== readerId));
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
              disabled={connecting}
            >
              {connecting
                ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
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

      {/* Deposit settings */}
      {isConnected && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Deposits</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Collect a percentage deposit when clients book online to secure their appointment.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Require deposit for all online bookings</Label>
              <p className="text-xs text-gray-500">
                {depositConfig.deposit_enabled ? "Deposit required at booking" : "No deposit required"}
              </p>
            </div>
            <Switch
              checked={depositConfig.deposit_enabled}
              onCheckedChange={(v) => setDepositConfig((p) => ({ ...p, deposit_enabled: v }))}
            />
          </div>

          {depositConfig.deposit_enabled && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Deposit percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    className="max-w-[120px]"
                    value={depositConfig.deposit_percentage}
                    onChange={(e) =>
                      setDepositConfig((p) => ({
                        ...p,
                        deposit_percentage: Math.min(100, Math.max(1, parseInt(e.target.value) || 20)),
                      }))
                    }
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <p className="text-[10px] text-gray-400">
                  Percentage of service price charged at booking.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Refund window (hours)</Label>
                <Input
                  type="number"
                  min="0"
                  className="max-w-[160px]"
                  value={depositConfig.deposit_refund_hours}
                  onChange={(e) =>
                    setDepositConfig((p) => ({
                      ...p,
                      deposit_refund_hours: Math.max(0, parseInt(e.target.value) || 24),
                    }))
                  }
                />
                <p className="text-[10px] text-gray-400">
                  Refund deposit if cancelled more than {depositConfig.deposit_refund_hours}h before appointment.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Allow tip at deposit</Label>
                  <p className="text-xs text-gray-500">Let clients add a tip when paying the deposit</p>
                </div>
                <Switch
                  checked={depositConfig.deposit_pretip_enabled}
                  onCheckedChange={(v) => setDepositConfig((p) => ({ ...p, deposit_pretip_enabled: v }))}
                />
              </div>
            </>
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

      {/* Card Readers */}
      {isConnected && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Card Readers</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage Stripe Terminal readers for in-person card payments.
            </p>
          </div>

          {/* Terminal location setup required */}
          {!shop?.stripe_terminal_location_id ? (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-amber-900">Terminal location required</p>
                <p className="text-xs text-amber-700 mt-0.5">Set up a location before registering readers.</p>
              </div>
              <Button size="sm" className="h-8 text-xs flex-shrink-0 gap-1.5" onClick={setupTerminalLocation} disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Set up location
              </Button>
            </div>
          ) : (
            <>
              {/* Location ID badge */}
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{shop.stripe_terminal_location_id}</span>
              </div>

              {/* Readers list */}
              {readersLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading readers...
                </div>
              ) : readers.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">No readers registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {readers.map((reader) => (
                    <div
                      key={reader.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Tablet className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{reader.label || reader.id}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {reader.device_type?.replace(/_/g, ' ')} ·{' '}
                            <span className={reader.status === 'online' ? 'text-green-600' : 'text-gray-400'}>
                              {reader.status}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                        onClick={() => deleteReader(reader.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Register reader form */}
              {showRegisterForm ? (
                <div className="p-3 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700">Register a reader</p>
                  <div>
                    <Label className="text-xs">Registration code</Label>
                    <Input
                      className="h-8 text-sm font-mono mt-1"
                      placeholder="e.g. simulated-wpe"
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value)}
                      autoFocus
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Shown on the reader's display when ready to pair.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Label (optional)</Label>
                    <Input
                      className="h-8 text-sm mt-1"
                      placeholder="e.g. Front desk"
                      value={regLabel}
                      onChange={(e) => setRegLabel(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8 bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white gap-1.5"
                      disabled={!regCode.trim() || registerSaving}
                      onClick={registerReader}
                    >
                      {registerSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Register
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => { setShowRegisterForm(false); setRegCode(''); setRegLabel(''); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setShowRegisterForm(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Register reader
                </Button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
