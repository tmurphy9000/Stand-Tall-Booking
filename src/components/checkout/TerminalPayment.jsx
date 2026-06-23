import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Tablet, CheckCircle, XCircle, AlertCircle } from "lucide-react";

function loadTerminalScript() {
  return new Promise((resolve, reject) => {
    if (window.StripeTerminal) { resolve(); return; }
    const existing = document.querySelector('script[src="https://js.stripe.com/terminal/v1/"]');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/terminal/v1/';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Stripe Terminal SDK'));
    document.head.appendChild(script);
  });
}

// States:
// loading → ready → discovering → select_reader → connecting → connected
//   → waiting_for_card → processing → success | error
export default function TerminalPayment({
  shopId,
  locationId,
  amountCents,
  description,
  metadata,
  onSuccess,
  onCancel,
}) {
  const [status, setStatus] = useState('loading');
  const [readers, setReaders] = useState([]);
  const [connectedReader, setConnectedReader] = useState(null);
  const [error, setError] = useState('');
  const terminalRef = useRef(null);
  const collectingRef = useRef(false);

  useEffect(() => {
    if (!locationId) {
      setError('Terminal location not configured. Go to Settings → Payments to set up card readers.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    loadTerminalScript()
      .then(() => {
        if (cancelled) return;
        const t = window.StripeTerminal.create({
          onFetchConnectionToken: async () => {
            const { data, error: fnErr } = await supabase.functions.invoke(
              'stripe-terminal-connection-token',
              { body: { shopId } }
            );
            if (fnErr || !data?.secret) {
              throw new Error(fnErr?.message || 'Failed to fetch connection token');
            }
            return data.secret;
          },
          onUnexpectedReaderDisconnect: () => {
            if (!cancelled) {
              setConnectedReader(null);
              setStatus('ready');
              setError('Reader disconnected unexpectedly.');
            }
          },
        });
        terminalRef.current = t;
        if (!cancelled) setStatus('ready');
      })
      .catch((err) => {
        if (!cancelled) {
          setError('Failed to load Stripe Terminal SDK. Check your connection and try again.');
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
      const t = terminalRef.current;
      if (t) {
        if (collectingRef.current) {
          t.cancelCollectPaymentMethod().catch(() => {});
        }
        t.disconnectReader().catch(() => {});
        terminalRef.current = null;
      }
    };
  }, [shopId, locationId]);

  const discoverReaders = async () => {
    setStatus('discovering');
    setError('');
    const result = await terminalRef.current.discoverReaders({ simulated: false });
    if (result.error) {
      setError(result.error.message);
      setStatus('ready');
      return;
    }
    const found = result.discoveredReaders ?? [];
    if (found.length === 0) {
      setError('No readers found. Make sure your card reader is powered on and connected to the internet.');
      setStatus('ready');
      return;
    }
    setReaders(found);
    setStatus('select_reader');
  };

  const connectToReader = async (reader) => {
    setStatus('connecting');
    setError('');
    const result = await terminalRef.current.connectReader(reader);
    if (result.error) {
      setError(result.error.message);
      setStatus('select_reader');
      return;
    }
    setConnectedReader(result.reader);
    setStatus('connected');
  };

  const startCharge = async () => {
    setError('');

    // Create PaymentIntent server-side (card_present, direct charge on connected account)
    const { data, error: fnErr } = await supabase.functions.invoke('createStripePayment', {
      body: { amount: amountCents, shopId, terminal: true, description, metadata },
    });
    if (fnErr || !data?.clientSecret) {
      setError((fnErr?.message || data?.error) || 'Failed to create payment');
      return;
    }

    // Show "waiting for card" state and collect
    setStatus('waiting_for_card');
    collectingRef.current = true;
    const collectResult = await terminalRef.current.collectPaymentMethod(data.clientSecret);
    collectingRef.current = false;

    if (collectResult.error) {
      // code 'canceled' means user clicked Cancel — don't show error
      if (collectResult.error.code !== 'canceled') {
        setError(collectResult.error.message);
      }
      setStatus('connected');
      return;
    }

    // Process payment
    setStatus('processing');
    const processResult = await terminalRef.current.processPayment(collectResult.paymentIntent);
    if (processResult.error) {
      setError(processResult.error.message);
      setStatus('connected');
      return;
    }

    setStatus('success');
    onSuccess(processResult.paymentIntent.id);
  };

  const cancelCollection = async () => {
    if (collectingRef.current && terminalRef.current) {
      await terminalRef.current.cancelCollectPaymentMethod().catch(() => {});
      collectingRef.current = false;
    }
    setStatus('connected');
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading Terminal SDK...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
        <div className="flex items-start gap-2 text-sm text-red-700">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
        {locationId && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setError(''); setStatus('ready'); }}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Tablet className="w-4 h-4" />
          Card Reader
        </div>
        {error && (
          <div className="flex items-start gap-2 text-xs text-amber-700">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs" onClick={discoverReaders}>
            Find readers
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'discovering') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Searching for readers...
      </div>
    );
  }

  if (status === 'select_reader') {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Select a reader:</p>
        <div className="space-y-1.5">
          {readers.map((reader) => (
            <button
              key={reader.id}
              onClick={() => connectToReader(reader)}
              className="w-full flex items-center justify-between p-2.5 rounded-md border border-border bg-card hover:border-[#8B9A7E] hover:bg-[#8B9A7E]/5 transition-all text-left"
            >
              <div>
                <p className="text-sm font-medium">{reader.label || reader.id}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {reader.device_type?.replace(/_/g, ' ')} ·{' '}
                  <span className={reader.status === 'online' ? 'text-green-600' : 'text-muted-foreground'}>
                    {reader.status}
                  </span>
                </p>
              </div>
              <Tablet className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={discoverReaders}>
            Refresh
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Connecting to reader...
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="rounded-lg border border-[#8B9A7E]/40 bg-[#8B9A7E]/5 p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <Tablet className="w-4 h-4 text-[#8B9A7E]" />
          <span className="text-sm font-medium">{connectedReader?.label || connectedReader?.id}</span>
          <span className="text-xs text-green-600 ml-auto">Connected</span>
        </div>
        {error && (
          <div className="flex items-start gap-2 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            {error} — try again.
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-8 text-sm bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white"
            onClick={startCharge}
          >
            Charge ${(amountCents / 100).toFixed(2)}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'waiting_for_card') {
    return (
      <div className="rounded-lg border border-[#8B9A7E]/40 bg-[#8B9A7E]/5 p-3 space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#8B9A7E]" />
          Waiting for card...
        </div>
        <p className="text-xs text-muted-foreground">Ask the client to tap, swipe, or insert their card on the reader.</p>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelCollection}>
          Cancel
        </Button>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </div>
        <p className="text-xs text-muted-foreground">Do not remove the card.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 py-2">
        <CheckCircle className="w-4 h-4" />
        Payment approved!
      </div>
    );
  }

  return null;
}
