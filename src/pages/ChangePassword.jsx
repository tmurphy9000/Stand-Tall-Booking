import React, { useState } from "react";
import { functions } from "@/api/functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const barberData = localStorage.getItem("barber_session");
  const barber = barberData ? JSON.parse(barberData) : null;

  if (!barber) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Please log in first.</p>
            <Button
              onClick={() => window.location.href = "/barber-login"}
              className="w-full mt-4 bg-[#8B9A7E] hover:bg-[#6B7A5E]"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await functions.invoke("changeBarberPassword", {
        barber_id: barber.barber_id,
        old_password: oldPassword,
        new_password: newPassword,
      });

      toast.success("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to change password");
    } finally {
      setLoading(false);
    }
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

          <h1 className="text-2xl font-bold text-center text-[#0A0A0A] mb-2">
            Change Password
          </h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            Hi {barber.barber_name}! {barber.is_temp && "(Temporary password active)"}
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label className="text-sm text-gray-700">Current Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter your current password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-700">New Password</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a new password"
                disabled={loading}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm text-gray-700">Confirm Password</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                disabled={loading}
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white h-10 mt-6"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>

          <button
            onClick={() => {
              localStorage.removeItem("barber_session");
              window.location.href = "/barber-login";
            }}
            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Log Out
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
