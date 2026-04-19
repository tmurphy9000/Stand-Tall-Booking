import React, { useState } from "react";
import { base44 } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AdminPasswordManager({ settings }) {
  const queryClient = useQueryClient();
  const [password1, setPassword1] = useState(settings?.admin_password_1 || "2024");
  const [password2, setPassword2] = useState(settings?.admin_password_2 || "1212");
  const [showPasswords, setShowPasswords] = useState(false);

  const updatePasswords = useMutation({
    mutationFn: async () => {
      if (!password1 || !password2) {
        throw new Error("Both passwords are required");
      }
      if (password1.length < 4 || password2.length < 4) {
        throw new Error("Passwords must be at least 4 characters");
      }
      
      if (settings?.id) {
        return await base44.entities.ShopSettings.update(settings.id, {
          admin_password_1: password1,
          admin_password_2: password2,
        });
      } else {
        return await base44.entities.ShopSettings.create({
          admin_password_1: password1,
          admin_password_2: password2,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      toast.success("Admin passwords updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Admin Passwords
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Set and manage the two admin passwords for your barbershop. These passwords can be used for secure access.
        </p>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500">Admin Password 1</Label>
            <div className="relative">
              <Input
                type={showPasswords ? "text" : "password"}
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                placeholder="Enter password 1"
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Admin Password 2</Label>
            <div className="relative">
              <Input
                type={showPasswords ? "text" : "password"}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Enter password 2"
                className="pr-10"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => updatePasswords.mutate()}
            disabled={updatePasswords.isPending}
            className="bg-[#C9A94E] hover:bg-[#A07D2B]"
          >
            {updatePasswords.isPending ? "Saving..." : "Save Passwords"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPassword1(settings?.admin_password_1 || "2024");
              setPassword2(settings?.admin_password_2 || "1212");
            }}
          >
            Reset
          </Button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> Keep these passwords secure. If compromised, change them immediately using this form.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}