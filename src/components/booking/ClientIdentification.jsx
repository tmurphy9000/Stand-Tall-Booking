import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, User, Calendar, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ClientIdentification({ onSuccess }) {
  const [step, setStep] = useState("identify"); // identify or register
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Registration fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");

  const handleIdentify = async (e) => {
    e.preventDefault();
    setError("");

    if (!email && !phone) {
      setError("Please enter your email or phone number");
      return;
    }

    setLoading(true);
    try {
      const clients = await base44.entities.Client.filter({});
      const existing = clients.find(
        (c) =>
          (email && c.email?.toLowerCase() === email.toLowerCase()) ||
          (phone && c.phone === phone)
      );

      if (existing) {
        onSuccess(existing);
      } else {
        setRegEmail(email || "");
        setRegPhone(phone || "");
        setStep("register");
      }
    } catch (err) {
      setError("Failed to check account");
      toast.error("Failed to check account");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName || !birthday || !regEmail || !regPhone) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      const newClient = await base44.entities.Client.create({
        name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        email: regEmail,
        phone: regPhone,
        birthday: birthday,
        total_visits: 0,
        total_spent: 0,
        no_show_count: 0,
        late_count: 0,
      });

      onSuccess(newClient);
    } catch (err) {
      setError("Failed to create account");
      toast.error("Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {step === "identify" && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-[#0A0A0A] mb-1">
              Get Started
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email or phone to find your account
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleIdentify} className="space-y-4">
              <div>
                <Label className="text-sm text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email
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
                <p className="text-center text-sm text-gray-400">or</p>
              </div>

              <div>
                <Label className="text-sm text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone
                </Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
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
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "register" && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-[#0A0A0A] mb-1">
              Create Account
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Tell us a bit about yourself
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-gray-700">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-700">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email
                </Label>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone
                </Label>
                <Input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Birthday
                </Label>
                <Input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("identify");
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}