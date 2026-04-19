import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/entities";

export function usePermissions() {
  const barberSessionRaw = localStorage.getItem('barber_session');
  const sessionData = barberSessionRaw ? JSON.parse(barberSessionRaw) : null;

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => entities.Barber.list(),
  });

  const currentBarber = sessionData?.barber_id
    ? barbers.find(b => b.id === sessionData.barber_id)
    : null;

  const permissionLevel = currentBarber?.permission_level || null;
  const isOwner = permissionLevel === "owner";
  const isManager = permissionLevel === "manager";
  const isServiceProvider = permissionLevel === "service_provider";
  const hasFullAccess = isOwner || isManager;
  const canViewClientDetails = hasFullAccess || isServiceProvider;

  const user = sessionData
    ? {
        id: sessionData.barber_id,
        email: sessionData.email,
        full_name: sessionData.barber_name,
        role: permissionLevel || 'barber',
      }
    : null;

  return {
    user,
    isAdmin: false,
    isOwner,
    isManager,
    isServiceProvider,
    hasFullAccess,
    canViewClientDetails,
    permissionLevel,
    currentBarber,
  };
}
