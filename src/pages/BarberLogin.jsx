import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function BarberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError("Invalid email or password");
      return;
    }

    window.location.href = "/";
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");

    if (!forgotEmail) {
      setForgotError("Please enter your email address");
      return;
    }

    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/ChangePassword`,
    });
    setForgotLoading(false);

    if (error) {
      setForgotError(error.message || "Failed to send reset email");
      return;
    }

    setForgotSent(true);
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="flex justify-center mb-6">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png"
                alt="Stand Tall Barbershop"
                className="w-20 h-20 rounded-xl shadow-md"
              />
            </div>

            <h1 className="text-xl font-bold text-center text-[#0A0A0A] mb-1">Reset Password</h1>
            <p className="text-center text-sm text-gray-500 mb-6">
              Enter your email and we'll send you a reset link.
            </p>

            {forgotSent ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-[#8B9A7E]" />
                <p className="text-sm font-medium text-gray-700 text-center">
                  Reset email sent! Check your inbox and follow the link to set a new password.
                </p>
                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
                  className="text-sm text-[#8B9A7E] hover:underline mt-2"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{forgotError}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Address
                  </Label>
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={forgotLoading}
                    className="mt-1"
                    autoComplete="email"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white h-10 mt-2"
                >
                  {forgotLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotError(""); }}
                  className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl border-0">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="flex justify-center mb-6">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6993eba91209ee0a1089f355/fd9cfe023_6f5fd5cc-8fc9-4041-9d87-c24e77a3bc58.png"
              alt="Stand Tall Barbershop"
              className="w-36 h-36 rounded-xl shadow-md"
            />
          </div>

          <h1 className="text-2xl font-bold text-center text-[#0A0A0A] mb-1">
            Welcome Back
          </h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            Sign in to your Stand Tall account
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-sm text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email Address
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
                className="mt-1"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Password
                </Label>
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                  className="text-xs text-[#8B9A7E] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white h-11 mt-2 text-base font-semibold"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Need help? Contact your manager
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
