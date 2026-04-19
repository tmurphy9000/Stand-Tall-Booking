import React, { useState } from "react";
import { functions } from "@/api/functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function BarberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await functions.invoke("barberLogin", { email, password });

      localStorage.setItem("barber_session", JSON.stringify(response.data));
      toast.success("Logged in successfully!");

      if (response.data.is_temp) {
        setTimeout(() => { window.location.href = "/ChangePassword"; }, 500);
      } else {
        setTimeout(() => { window.location.href = "/"; }, 500);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Login failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#8B9A7E] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">STB</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-[#0A0A0A] mb-2">
            Barber Login
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
              />
            </div>

            <div>
              <Label className="text-sm text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
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
              className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white h-10 mt-6"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Need help? Contact your manager
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
