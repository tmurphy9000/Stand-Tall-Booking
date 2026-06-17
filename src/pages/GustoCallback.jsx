import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const REDIRECT_URI = `${window.location.origin}/gusto/callback`;

export default function GustoCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setErrorMsg(searchParams.get("error_description") || "Gusto authorization was denied.");
      setStatus("error");
      return;
    }

    if (!code) {
      setErrorMsg("No authorization code received from Gusto.");
      setStatus("error");
      return;
    }

    // Verify CSRF state token
    const savedState = sessionStorage.getItem("gusto_oauth_state");
    if (!savedState || savedState !== state) {
      setErrorMsg("Invalid state parameter. Please try connecting again.");
      setStatus("error");
      return;
    }
    sessionStorage.removeItem("gusto_oauth_state");

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setErrorMsg("You must be logged in to connect a Gusto account.");
        setStatus("error");
        return;
      }

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

      const { data, error } = await supabase.functions.invoke("gusto-oauth-callback", {
        body: { code, shopId, redirectUri: REDIRECT_URI },
      });

      if (error || data?.error) {
        setErrorMsg(data?.error || error?.message || "Failed to connect Gusto account.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setTimeout(() => {
        window.location.href = "/Settings?tab=payroll&gusto=connected";
      }, 1500);
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 max-w-sm px-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#8B9A7E] mx-auto" />
            <p className="text-gray-700 font-medium">Connecting your Gusto account…</p>
            <p className="text-gray-400 text-sm">This usually takes a few seconds.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-gray-800 font-semibold text-lg">Gusto connected!</p>
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
              onClick={() => { window.location.href = "/Settings?tab=payroll"; }}
            >
              Back to Settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
