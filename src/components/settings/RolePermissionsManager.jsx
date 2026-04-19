import React, { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";

const PERMISSIONS = [
  { key: "view_calendar", label: "View Calendar", description: "Access to booking calendar" },
  { key: "create_booking", label: "Create Booking", description: "Create new bookings" },
  { key: "edit_booking", label: "Edit Booking", description: "Modify existing bookings" },
  { key: "cancel_booking", label: "Cancel Booking", description: "Cancel bookings" },
  { key: "checkout_booking", label: "Checkout Booking", description: "Process payment checkout" },
  { key: "edit_booking_contact", label: "Edit Booking Contact Info", description: "Enter/edit client contact when creating bookings" },
  { key: "view_client_contact", label: "View Client Contact", description: "Access phone/email" },
  { key: "view_client_notes", label: "View Client Notes", description: "Read client notes" },
  { key: "edit_client_notes", label: "Edit Client Notes", description: "Add/modify client notes" },
  { key: "view_shop_reports", label: "Shop Reporting", description: "Full access to entire shop and all barbers reporting" },
  { key: "view_personal_reports", label: "Personal Reporting", description: "View own individual numbers only" },
  { key: "view_payroll", label: "View Payroll", description: "Access payroll data" },
  { key: "view_inventory", label: "View Inventory", description: "Access inventory management" },
  { key: "manage_staff", label: "Manage Staff", description: "Add/edit staff members" },
  { key: "view_cash_tracker", label: "View Cash Tracker", description: "Access cash transactions" },
  { key: "manage_settings", label: "Manage Settings", description: "Access app settings" },
];

export default function RolePermissionsManager() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => base44.entities.RolePermissions.list(),
  });

  const updatePermission = useMutation({
    mutationFn: ({ id, permissionKey, value }) =>
      base44.entities.RolePermissions.update(id, { [permissionKey]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast.success("Permission updated");
    },
  });

  const createRoleIfMissing = async (role) => {
    const exists = rolePermissions.find(rp => rp.role === role);
    if (!exists) {
      const defaultPerms = {
        role,
        view_calendar: true,
        create_booking: role !== "service_provider",
        edit_booking: role !== "service_provider",
        cancel_booking: role !== "service_provider",
        checkout_booking: true,
        edit_booking_contact: true,
        view_client_contact: role !== "service_provider",
        view_client_notes: true,
        edit_client_notes: true,
        view_shop_reports: role !== "service_provider",
        view_personal_reports: role === "service_provider",
        view_payroll: role !== "service_provider",
        view_inventory: role !== "service_provider",
        manage_staff: role === "owner",
        view_cash_tracker: role !== "service_provider",
        manage_settings: role === "owner",
      };
      await base44.entities.RolePermissions.create(defaultPerms);
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    }
  };

  // Only show for admin, owner, or manager
  if (user && !["admin", "owner", "manager"].includes(user.role)) {
    return null;
  }

  const roles = ["service_provider", "manager", "owner"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600">
            Configure what each role can access and do in the app.
          </p>

          {roles.map(role => {
            const rolePerms = rolePermissions.find(rp => rp.role === role);
            
            // Ensure role exists
            if (!rolePerms) {
              createRoleIfMissing(role);
              return null;
            }

            return (
              <div key={role} className="border rounded-lg p-4">
                <h3 className="font-semibold text-[#0A0A0A] mb-4 capitalize">
                  {role.replace("_", " ")} Permissions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PERMISSIONS.map(perm => (
                    <div
                      key={perm.key}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <Label className="font-medium cursor-pointer">
                          {perm.label}
                        </Label>
                        <p className="text-xs text-gray-500">{perm.description}</p>
                      </div>
                      <Switch
                        checked={rolePerms[perm.key] || false}
                        onCheckedChange={(value) =>
                          updatePermission.mutate({
                            id: rolePerms.id,
                            permissionKey: perm.key,
                            value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}