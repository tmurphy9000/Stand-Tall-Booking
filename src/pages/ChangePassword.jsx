import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

// 'invite'   — new superadmin clicked their invite email link
// 'recovery' — existing user clicked a forgot-password email link
// null       — logged-in user navigated here from Settings
function useFlowType() {
  const [flowType, setFlowType] = useState(null);

  useEffect(() => {
    // Read hash synchronously before the Supabase client consumes it
    const params = new URLSearchParams(window.location.hash.slice(1));
    const t = params.get("type");
    if (t === "invite" || t === "recovery") setFlowType(t);
  }, []);

  return flowType;
}

const COPY = {
  invite: {
    title: "Set Your Password",
    description: "You've been invited as a Stand Tall admin. Create a password to access your account.",
    button: "Set Password",
    success: "Password set! Redirecting to the admin dashboard…",
  },
  recovery: {
    title: "Reset Your Password",
    description: "Enter a new password for your account.",
    button: "Reset Password",
    success: "Password reset! Redirecting…",
  },
  default: {
    title: "Change Password",
    description: null,
    button: "Update Password",
    success: "Password updated successfully!",
  },
};

export default function ChangePassword() {
  const { currentBarber, logout } = useAuth();
  const navigate = useNavigate();
  const flowType = useFlowType();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const copy = COPY[flowType] ?? COPY.default;

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to update password");
      return;
    }

    toast.success(copy.success);
    setNewPassword("");
    setConfirmPassword("");

    if (flowType === "invite") {
      navigate("/AdminDashboard");
    } else if (flowType === "recovery") {
      navigate("/");
    }
    // No redirect for the "change from settings" case — user stays on the page
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-[#8B9A7E]/10 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-[#8B9A7E]" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-foreground mb-2">
            {copy.title}
          </h1>
          {copy.description ? (
            <p className="text-center text-sm text-muted-foreground mb-6">{copy.description}</p>
          ) : currentBarber ? (
            <p className="text-center text-sm text-muted-foreground mb-6">Hi {currentBarber.name}!</p>
          ) : null}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">New Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a new password"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Confirm Password</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                disabled={loading}
                className="mt-1"
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white h-10 mt-6"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
              ) : (
                copy.button
              )}
            </Button>
          </form>

          <button
            onClick={logout}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-muted-foreground"
          >
            Log Out
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
