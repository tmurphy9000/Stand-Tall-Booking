import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AddBarberDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service_commission_rate: 50,
    product_commission_rate: 10,
  });

  const [sensitiveData, setSensitiveData] = useState({
    full_legal_name: "",
    drivers_license_number: "",
    ssn: "",
    bank_name: "",
    account_number: "",
    routing_number: "",
  });

  const createBarberMutation = useMutation({
    mutationFn: async () => {
      const barber = await base44.entities.Barber.create(formData);
      
      if (sensitiveData.full_legal_name) {
        await base44.entities.BarberSensitiveInfo.create({
          barber_id: barber.id,
          ...sensitiveData,
        });
      }
      
      return barber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      toast.success("Barber added successfully");
      setFormData({
        name: "",
        email: "",
        phone: "",
        service_commission_rate: 50,
        product_commission_rate: 10,
      });
      setSensitiveData({
        full_legal_name: "",
        drivers_license_number: "",
        ssn: "",
        bank_name: "",
        account_number: "",
        routing_number: "",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add barber");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }
    createBarberMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Barber & Setup Payroll</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="text-sm font-medium text-gray-700">Basic Information</h3>
            
            <div>
              <Label htmlFor="name" className="text-sm">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
                className="h-9"
              />
            </div>
          </div>

          {/* Commission Setup */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="text-sm font-medium text-gray-700">Commission Rates</h3>
            
            <div>
              <Label htmlFor="serviceRate" className="text-sm">Service Commission %</Label>
              <Input
                id="serviceRate"
                type="number"
                min="0"
                max="100"
                value={formData.service_commission_rate}
                onChange={(e) => setFormData({ ...formData, service_commission_rate: parseFloat(e.target.value) })}
                className="h-9"
              />
              <p className="text-xs text-gray-500 mt-1">Commission % from service revenue</p>
            </div>

            <div>
              <Label htmlFor="productRate" className="text-sm">Product Commission %</Label>
              <Input
                id="productRate"
                type="number"
                min="0"
                max="100"
                value={formData.product_commission_rate}
                onChange={(e) => setFormData({ ...formData, product_commission_rate: parseFloat(e.target.value) })}
                className="h-9"
              />
              <p className="text-xs text-gray-500 mt-1">Commission % from product sales</p>
            </div>
          </div>

          {/* Payroll Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Payroll Details (Optional)</h3>
            
            <div>
              <Label htmlFor="legalName" className="text-sm">Full Legal Name</Label>
              <Input
                id="legalName"
                value={sensitiveData.full_legal_name}
                onChange={(e) => setSensitiveData({ ...sensitiveData, full_legal_name: e.target.value })}
                placeholder="Legal name for payroll"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="license" className="text-sm">Driver's License #</Label>
              <Input
                id="license"
                value={sensitiveData.drivers_license_number}
                onChange={(e) => setSensitiveData({ ...sensitiveData, drivers_license_number: e.target.value })}
                placeholder="License number"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="ssn" className="text-sm">SSN</Label>
              <Input
                id="ssn"
                type="password"
                value={sensitiveData.ssn}
                onChange={(e) => setSensitiveData({ ...sensitiveData, ssn: e.target.value })}
                placeholder="Social security number"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="bank" className="text-sm">Bank Name</Label>
              <Input
                id="bank"
                value={sensitiveData.bank_name}
                onChange={(e) => setSensitiveData({ ...sensitiveData, bank_name: e.target.value })}
                placeholder="Bank name"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="routing" className="text-sm">Routing Number</Label>
              <Input
                id="routing"
                value={sensitiveData.routing_number}
                onChange={(e) => setSensitiveData({ ...sensitiveData, routing_number: e.target.value })}
                placeholder="Routing number"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="account" className="text-sm">Account Number</Label>
              <Input
                id="account"
                type="password"
                value={sensitiveData.account_number}
                onChange={(e) => setSensitiveData({ ...sensitiveData, account_number: e.target.value })}
                placeholder="Account number"
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createBarberMutation.isPending}
              className="bg-[#8B9A7E] hover:bg-[#6B7A5E]"
            >
              {createBarberMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Barber"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}