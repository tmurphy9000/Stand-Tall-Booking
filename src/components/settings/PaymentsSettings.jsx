import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useShop } from "@/lib/shopContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, AlertCircle, ExternalLink, Loader2, MapPin, Tablet, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TERMINAL_BEHAVIOR_KEY = "stripe_terminal_behavior";

function loadTerminalBehavior() {
  try {
    const s = localStorage.getItem(TERMINAL_BEHAVIOR_KEY);
    return s ? JSON.parse(s) : { collect_tip_on_terminal: true, auto_print_receipt: false };
  } catch {
    return { collect_tip_on_terminal: true, auto_print_receipt: false };
  }
}

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

  // Terminal SDK state
  const terminalRef = useRef(null);
  const [connectedReader, setConnectedReader] = useState(null);
  const [connectingReaderId, setConnectingReaderId] = useState(null);

  // Terminal behavior settings (persisted to localStorage)
  const [terminalBehavior, setTerminalBehavior] = useState(loadTerminalBehavior);

  const updateTerminalBehavior = (key, value) => {
    setTerminalBehavior(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(TERMINAL_BEHAVIOR_KEY, JSON.stringify(next));
      return next;
    });
  };

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
    if (connectedReader?.id === readerId) {
      await handleDisconnectReader();
    }
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

  // Lazily initialize the Stripe Terminal JS SDK on first use.
  // The connection token edge function is called automatically whenever the SDK needs one.
  const getTerminal = useCallback(async () => {
    if (terminalRef.current) return terminalRef.current;
    const { loadStripeTerminal } = await import('@stripe/terminal-js');
    const StripeTerminal = await loadStripeTerminal();
    terminalRef.current = StripeTerminal.create({
      onFetchConnectionToken: async () => {
        const { data, error } = await supabase.functions.invoke('stripe-terminal-connection-token', {
          body: { shopId },
        });
        if (error || !data?.secret) throw new Error(error?.message || 'Connection token fetch failed');
        return data.secret;
      },
      onUnexpectedReaderDisconnect: () => {
        setConnectedReader(null);
        toast.error('Card reader disconnected unexpectedly');
      },
    });
    return terminalRef.current;
  }, [shopId]);

  const handleConnectReader = async (reader) => {
    setConnectingReaderId(reader.id);
    try {
      const terminal = await getTerminal();
      // Disconnect from any currently active reader first
      if (connectedReader) {
        await terminal.disconnectReader().catch(() => {});
      }
      // discoverReaders gives us the live SDK reader objects needed by connectReader
      const { discoveredReaders, error: discoverError } = await terminal.discoverReaders({
        simulated: false,
        location: shop.stripe_terminal_location_id,
      });
      if (discoverError) throw new Error(discoverError.message);
      const target = (discoveredReaders || []).find(r => r.id === reader.id);
      if (!target) throw new Error('Reader not found or unavailable — check that it is online and at this location');
      const { reader: connected, error: connectError } = await terminal.connectReader(target);
      if (connectError) throw new Error(connectError.message);
      setConnectedReader(connected);
      toast.success(`Connected to ${connected.label || connected.id}`);
    } catch (err) {
      toast.error('Failed to connect: ' + (err.message || 'Unknown error'));
    } finally {
      setConnectingReaderId(null);
    }
  };

  const handleDisconnectReader = async () => {
    try {
      if (terminalRef.current) {
        await terminalRef.current.disconnectReader();
      }
      setConnectedReader(null);
      toast.success('Reader disconnected');
    } catch (err) {
      toast.error('Failed to disconnect: ' + (err.message || 'Unknown error'));
    }
  };

  if (shopLoading || loadingShop) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-[#8B9A7E]" />
      </div>
    );
  }

  const isStripeConnected = !!shop?.stripe_account_id;
  const hasTerminalLocation = !!shop?.stripe_terminal_location_id;

  return (
    <div className="space-y-8 max-w-lg">

      {/* ── Stripe Connect ── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Stripe Connect</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect your Stripe account so card payments go directly to you.
          </p>
        </div>

        <div className={`flex items-start gap-3 p-4 rounded-xl border ${
          isStripeConnected ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-muted/30 dark:bg-muted/30 border-border dark:border-border"
        }`}>
          {isStripeConnected
            ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {isStripeConnected ? "Stripe account connected" : "No Stripe account connected"}
            </p>
            {isStripeConnected ? (
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{shop.stripe_account_id}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect to enable card payments at checkout and online deposits.
              </p>
            )}
          </div>
          {isStripeConnected ? (
            <Button
              variant="outline" size="sm"
              className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
              onClick={disconnectStripe} disabled={saving}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs h-8 bg-[#635BFF] hover:bg-[#4B44D8] text-white flex-shrink-0"
              onClick={connectStripe} disabled={connecting}
            >
              {connecting
                ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
              Connect Stripe
            </Button>
          )}
        </div>

        {!isStripeConnected && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            You'll be redirected to Stripe to authorize the connection. Your clients' card payments and
            online deposits will flow directly into your Stripe account.
          </p>
        )}
      </section>

      {/* ── Deposits ── */}
      {isStripeConnected && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Deposits</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Collect a percentage deposit when clients book online to secure their appointment.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/30 rounded-lg border dark:border-border">
            <div>
              <Label className="text-sm font-medium">Require deposit for all online bookings</Label>
              <p className="text-xs text-muted-foreground">
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
                <Label className="text-xs text-muted-foreground">Deposit percentage (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min="1" max="100" className="max-w-[120px]"
                    value={depositConfig.deposit_percentage}
                    onChange={(e) => setDepositConfig((p) => ({
                      ...p,
                      deposit_percentage: Math.min(100, Math.max(1, parseInt(e.target.value) || 20)),
                    }))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Clients pay this % of their service total at the time of booking.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Refund window (hours)</Label>
                <Input
                  type="number" min="0" className="max-w-[160px]"
                  value={depositConfig.deposit_refund_hours}
                  onChange={(e) => setDepositConfig((p) => ({
                    ...p,
                    deposit_refund_hours: Math.max(0, parseInt(e.target.value) || 24),
                  }))}
                />
                <p className="text-[10px] text-muted-foreground">
                  Refund if cancelled more than {depositConfig.deposit_refund_hours}h before appointment.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/30 rounded-lg border dark:border-border">
                <div>
                  <Label className="text-sm font-medium">Allow pre-tip</Label>
                  <p className="text-xs text-muted-foreground">Allow clients to add a tip when paying their deposit</p>
                </div>
                <Switch
                  checked={depositConfig.deposit_pretip_enabled}
                  onCheckedChange={(v) => setDepositConfig((p) => ({ ...p, deposit_pretip_enabled: v }))}
                />
              </div>
            </>
          )}

          <Button
            size="sm" className="h-8 bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white gap-1.5"
            disabled={saving} onClick={saveDepositSettings}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save deposit settings
          </Button>
        </section>
      )}

      {/* ── Card Readers ── */}
      {isStripeConnected && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Card Readers</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage Stripe Terminal readers for in-person card payments. Connect a reader to take payments
              from the checkout screen.
            </p>
          </div>

          {!hasTerminalLocation ? (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-amber-900">Terminal location required</p>
                <p className="text-xs text-amber-700 mt-0.5">Set up a location before registering readers.</p>
              </div>
              <Button
                size="sm" className="h-8 text-xs flex-shrink-0 gap-1.5"
                onClick={setupTerminalLocation} disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Set up location
              </Button>
            </div>
          ) : (
            <>
              {/* Location ID badge */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{shop.stripe_terminal_location_id}</span>
              </div>

              {/* Readers list */}
              {readersLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading readers...
                </div>
              ) : readers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">No readers registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {readers.map((reader) => {
                    const isReaderConnected = connectedReader?.id === reader.id;
                    const isConnectingThis = connectingReaderId === reader.id;
                    return (
                      <div
                        key={reader.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isReaderConnected ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-muted/30 dark:bg-muted/30 border-border dark:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Tablet className={`w-4 h-4 flex-shrink-0 ${isReaderConnected ? 'text-green-600' : 'text-muted-foreground'}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{reader.label || reader.id}</p>
                            <p className="text-xs capitalize">
                              <span className="text-muted-foreground">{reader.device_type?.replace(/_/g, ' ')}</span>
                              {' · '}
                              <span className={reader.status === 'online' ? 'text-green-600' : 'text-muted-foreground'}>
                                {reader.status}
                              </span>
                              {isReaderConnected && (
                                <span className="text-green-600 font-medium"> · active</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isReaderConnected ? (
                            <Button
                              variant="outline" size="sm"
                              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={handleDisconnectReader}
                            >
                              Disconnect
                            </Button>
                          ) : (
                            <Button
                              variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => handleConnectReader(reader)}
                              disabled={isConnectingThis || !!connectingReaderId || reader.status !== 'online'}
                            >
                              {isConnectingThis && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                              Connect
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            onClick={() => deleteReader(reader.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Register reader form */}
              {showRegisterForm ? (
                <div className="p-3 border border-border dark:border-border rounded-lg space-y-3 bg-muted/30 dark:bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground dark:text-gray-300">Register a reader</p>
                  <div>
                    <Label className="text-xs">Registration code</Label>
                    <Input
                      className="h-8 text-sm font-mono mt-1"
                      placeholder="e.g. simulated-wpe"
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value)}
                      autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
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
                      size="sm" variant="ghost" className="h-8"
                      onClick={() => { setShowRegisterForm(false); setRegCode(''); setRegLabel(''); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm" variant="outline" className="h-8 text-xs gap-1.5"
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

      {/* ── Terminal Behavior (merged from Hardware settings) ── */}
      {isStripeConnected && hasTerminalLocation && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Terminal Behavior</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure how card readers behave during checkout.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/30 rounded-lg border dark:border-border">
              <div>
                <Label className="text-sm font-medium">Collect tip on terminal</Label>
                <p className="text-xs text-muted-foreground">
                  Show tip selection on the customer-facing reader screen.
                </p>
              </div>
              <Switch
                checked={terminalBehavior.collect_tip_on_terminal}
                onCheckedChange={(v) => updateTerminalBehavior('collect_tip_on_terminal', v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/30 rounded-lg border dark:border-border">
              <div>
                <Label className="text-sm font-medium">Auto-print receipt</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically print a receipt after each completed payment.
                </p>
              </div>
              <Switch
                checked={terminalBehavior.auto_print_receipt}
                onCheckedChange={(v) => updateTerminalBehavior('auto_print_receipt', v)}
              />
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
