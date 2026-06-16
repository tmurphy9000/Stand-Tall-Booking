import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StripeCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setErrorMsg(searchParams.get("error_description") || "Stripe authorization was denied.");
      setStatus("error");
      return;
    }

    if (!code) {
      setErrorMsg("No authorization code received from Stripe.");
      setStatus("error");
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setErrorMsg("You must be logged in to connect a Stripe account.");
        setStatus("error");
        return;
      }

      // Prefer shop_id from auth metadata; fall back to barbers table lookup
      let shopId = session.user.user_metadata?.shop_id ?? null;
      if (!shopId) {
        const { data: barberRows } = await supabase
          .from("barbers")
          .select("shop_id")
          .eq("user_id", session.user.id)
          .limit(1);
        shopId = barberRows?.[0]?.shop_id ?? null;
      }

      if (!shopId) {
        setErrorMsg("No shop found for your account. Contact support.");
        setStatus("error");
        return;
      }

      const { data, error } = await supabase.functions.invoke("stripe-connect-callback", {
        body: { code, shopId },
      });

      if (error || data?.error) {
        setErrorMsg(data?.error || error?.message || "Failed to connect Stripe account.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setTimeout(() => {
        window.location.href = "/Settings?tab=payments&connected=true";
      }, 1500);
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 max-w-sm px-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#8B9A7E] mx-auto" />
            <p className="text-gray-700 font-medium">Connecting your Stripe account…</p>
            <p className="text-gray-400 text-sm">This usually takes a few seconds.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-gray-800 font-semibold text-lg">Stripe connected!</p>
            <p className="text-gray-500 text-sm">Redirecting you back to settings…</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-gray-800 font-semibold text-lg">Connection failed</p>
            <p className="text-red-600 text-sm">{errorMsg}</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => { window.location.href = "/Settings?tab=payments"; }}
            >
              Back to Settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
