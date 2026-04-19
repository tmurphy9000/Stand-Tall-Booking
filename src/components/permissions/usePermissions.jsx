import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";

export function usePermissions() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const isAdmin = user?.role === "admin";
  
  // Find barber record linked to current user
  const currentBarber = user?.id ? barbers.find(b => b.user_id === user.id) : null;
  const permissionLevel = currentBarber?.permission_level || null;

  const isOwner = permissionLevel === "owner";
  const isManager = permissionLevel === "manager";
  const isServiceProvider = permissionLevel === "service_provider";
  const hasFullAccess = isAdmin || isOwner || isManager;
  const canViewClientDetails = hasFullAccess || isServiceProvider;

  return {
    user,
    isAdmin,
    isOwner,
    isManager,
    isServiceProvider,
    hasFullAccess,
    canViewClientDetails,
    permissionLevel,
    currentBarber,
  };
}