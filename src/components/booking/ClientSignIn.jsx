import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ClientSignIn({ onSuccess, onNeedRegister }) {
  const [contactInput, setContactInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const handleSignIn = async () => {
    if (!contactInput.trim()) {
      toast.error("Please enter your email or phone number");
      return;
    }

    setIsLoading(true);
    
    // Search for client by email or phone
    const foundClient = clients.find(c => 
      c.email?.toLowerCase() === contactInput.toLowerCase() || 
      c.phone === contactInput
    );

    if (foundClient) {
      onSuccess(foundClient);
      toast.success("Welcome back!");
    } else {
      toast.info("No account found. Let's create one!");
      onNeedRegister();
    }
    
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSignIn();
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Welcome</h2>
          <p className="text-sm text-gray-500 mt-1">Sign in or create an account</p>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4" /> Email or Phone Number
          </Label>
          <Input
            value={contactInput}
            onChange={(e) => setContactInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="your@email.com or (555) 123-4567"
            className="text-center"
            disabled={isLoading}
          />
        </div>

        <Button
          onClick={handleSignIn}
          disabled={isLoading || !contactInput.trim()}
          className="w-full bg-[#C9A94E] hover:bg-[#A07D2B] text-white h-11"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...
            </>
          ) : (
            "Continue"
          )}
        </Button>

        <p className="text-xs text-gray-400 text-center mt-4">
          We'll search for your account and create one if needed.
        </p>
      </CardContent>
    </Card>
  );
}