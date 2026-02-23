import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, DollarSign, Eye, EyeOff, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "../permissions/usePermissions";
import AccessDenied from "./AccessDenied";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function PayrollManager() {
  const queryClient = useQueryClient();
  const { hasFullAccess } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSSN, setShowSSN] = useState({});
  const [showAccount, setShowAccount] = useState({});

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: sensitiveInfo = [] } = useQuery({
    queryKey: ["barberSensitiveInfo"],
    queryFn: () => base44.entities.BarberSensitiveInfo.list(),
    enabled: hasFullAccess,
  });

  const updateInfo = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BarberSensitiveInfo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barberSensitiveInfo"] });
      toast.success("Payroll information updated");
      setShowForm(false);
      setEditing(null);
    },
  });

  const deleteInfo = useMutation({
    mutationFn: (id) => base44.entities.BarberSensitiveInfo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barberSensitiveInfo"] });
      toast.success("Payroll information deleted");
    },
  });

  const [form, setForm] = useState({
    bank_name: "",
    account_number: "",
    routing_number: "",
  });

  const openEdit = (info) => {
    setEditing(info);
    setForm({
      bank_name: info.bank_name || "",
      account_number: info.account_number || "",
      routing_number: info.routing_number || "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!editing) return;
    updateInfo.mutate({ id: editing.id, data: form });
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete payroll information? This cannot be undone.")) {
      deleteInfo.mutate(id);
    }
  };

  const maskSSN = (ssn) => {
    if (!ssn) return "N/A";
    return `***-**-${ssn.slice(-4)}`;
  };

  const maskAccount = (account) => {
    if (!account) return "N/A";
    return `****${account.slice(-4)}`;
  };

  if (!hasFullAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Payroll & Sensitive Information</h3>
        <Link to={createPageUrl("RunPayroll")}>
          <Button size="sm" className="h-8 text-xs bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white gap-1">
            <PlayCircle className="w-3 h-3" /> Run Payroll
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {sensitiveInfo.map(info => {
          const barber = barbers.find(b => b.id === info.barber_id || b.email === info.barber_id);
          return (
            <Card key={info.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{barber?.name || "Unknown"}</p>
                    <p className="text-xs text-gray-500">{info.full_legal_name}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(info)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(info.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Driver's License:</span>
                    <span className="font-mono">{info.drivers_license_number || "N/A"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">SSN:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {showSSN[info.id] ? info.ssn : maskSSN(info.ssn)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowSSN(prev => ({ ...prev, [info.id]: !prev[info.id] }))}
                      >
                        {showSSN[info.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>

                  {info.bank_name && (
                    <>
                      <div className="border-t border-gray-100 my-2 pt-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Bank:</span>
                        <span>{info.bank_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Routing #:</span>
                        <span className="font-mono">{info.routing_number || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Account #:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {showAccount[info.id] ? info.account_number : maskAccount(info.account_number)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setShowAccount(prev => ({ ...prev, [info.id]: !prev[info.id] }))}
                          >
                            {showAccount[info.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {sensitiveInfo.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <DollarSign className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No payroll information yet</p>
              <p className="text-xs text-gray-400 mt-1">Invite barbers to add their banking details</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit banking info dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Banking Information</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-gray-500">Bank Name</Label>
              <Input 
                value={form.bank_name} 
                onChange={e => setForm(prev => ({ ...prev, bank_name: e.target.value }))}
                placeholder="Chase Bank" 
              />
            </div>
            
            <div>
              <Label className="text-xs text-gray-500">Routing Number</Label>
              <Input 
                value={form.routing_number} 
                onChange={e => setForm(prev => ({ ...prev, routing_number: e.target.value }))}
                placeholder="123456789"
                maxLength={9}
              />
            </div>
            
            <div>
              <Label className="text-xs text-gray-500">Account Number</Label>
              <Input 
                type="password"
                value={form.account_number} 
                onChange={e => setForm(prev => ({ ...prev, account_number: e.target.value }))}
                placeholder="Account number" 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#B0BFA4] hover:bg-[#8B9A7E] text-white">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}