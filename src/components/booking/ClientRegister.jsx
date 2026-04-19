import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, User, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

export default function ClientRegister({ onSuccess, onBack }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const createClient = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: (newClient) => {
      toast.success("Account created!");
      onSuccess(newClient);
    },
    onError: () => {
      toast.error("Failed to create account");
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    createClient.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
    });
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Create Your Account</h2>
          <p className="text-sm text-gray-500 mt-1">We'll save your info for future bookings</p>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4" /> Full Name *
          </Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="John Doe"
            disabled={createClient.isPending}
          />
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4" /> Email *
          </Label>
          <Input
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="john@example.com"
            type="email"
            disabled={createClient.isPending}
          />
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4" /> Phone Number *
          </Label>
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 123-4567"
            disabled={createClient.isPending}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={createClient.isPending || !form.name.trim() || !form.email.trim() || !form.phone.trim()}
          className="w-full bg-[#C9A94E] hover:bg-[#A07D2B] text-white h-11"
        >
          {createClient.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
            </>
          ) : (
            "Create Account & Continue"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}