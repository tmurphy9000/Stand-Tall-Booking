import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Crown } from "lucide-react";
import { toast } from "sonner";

export default function PermissionsManager() {
  const queryClient = useQueryClient();

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
          <p className="mb-2"><strong>Owner/Manager:</strong> Full access to all features including reports and client lists</p>
          <p><strong>Service Provider:</strong> Limited access - can see client names, past services, and notes, but NOT contact information</p>
        </div>

        {barbers.map(barber => (
          <div key={barber.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="flex-1">
              <p className="font-medium">{barber.name}</p>
              <p className="text-xs text-gray-500">{barber.email}</p>
            </div>
            
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
                <SelectTrigger className="w-[180px]">
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

              <Select
                value={barber.permission_level}
                onValueChange={(permission_level) => {
                  updatePermission.mutate({
                    barberId: barber.id,
                    permission_level,
                    user_id: barber.user_id
                  });
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="service_provider">Service Provider</SelectItem>
                </SelectContent>
              </Select>

              <Badge className={getPermissionColor(barber.permission_level)}>
                {getPermissionIcon(barber.permission_level)}
                {barber.permission_level}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}