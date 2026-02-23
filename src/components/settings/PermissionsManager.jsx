import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, User, Crown } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "../permissions/usePermissions";

export default function PermissionsManager() {
  const queryClient = useQueryClient();
  const { hasFullAccess } = usePermissions();

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const updatePermission = useMutation({
    mutationFn: ({ barberId, permission_level, user_id }) => 
      base44.entities.Barber.update(barberId, { permission_level, user_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      toast.success("Permissions updated");
    },
  });

  const getPermissionIcon = (level) => {
    if (level === "owner") return <Crown className="w-4 h-4 text-yellow-600" />;
    if (level === "manager") return <Shield className="w-4 h-4 text-blue-600" />;
    return <User className="w-4 h-4 text-gray-600" />;
  };

  const getPermissionColor = (level) => {
    if (level === "owner") return "bg-yellow-100 text-yellow-800";
    if (level === "manager") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  if (!hasFullAccess) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Staff Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-gray-600 mb-4">
          <p className="mb-2"><strong>Manager:</strong> Access to reports, settings, and full client information</p>
          <p><strong>Service Provider:</strong> Limited access - can see client names, past services, and notes, but NOT contact information</p>
        </div>

        {barbers.map(barber => (
          <div key={barber.id} className="flex flex-col gap-3 p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{barber.name}</p>
                  <Badge className={getPermissionColor(barber.permission_level)}>
                    {getPermissionIcon(barber.permission_level)}
                    {barber.permission_level.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{barber.email}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pl-4 border-l-2">
              <div className="flex items-center gap-2">
                <Select
                  value={barber.user_id || ""}
                  onValueChange={(user_id) => {
                    updatePermission.mutate({
                      barberId: barber.id,
                      user_id,
                      permission_level: barber.permission_level
                    });
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Link user account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No user linked</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {barber.permission_level !== "owner" && (
                <div className="flex items-center gap-3">
                  <Switch
                    id={`manager-${barber.id}`}
                    checked={barber.permission_level === "manager"}
                    onCheckedChange={(checked) => {
                      updatePermission.mutate({
                        barberId: barber.id,
                        permission_level: checked ? "manager" : "service_provider",
                        user_id: barber.user_id
                      });
                    }}
                  />
                  <Label htmlFor={`manager-${barber.id}`} className="cursor-pointer">
                    Manager Permissions
                  </Label>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}