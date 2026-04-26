import { useAuth } from '@/lib/AuthContext';

export function usePermissions() {
  const { user, currentBarber } = useAuth();

  const permissionLevel = currentBarber?.permission_level ?? null;
  const isOwner = permissionLevel === 'owner';
  const isManager = permissionLevel === 'manager';
  const isServiceProvider = permissionLevel === 'service_provider';
  const hasFullAccess = isOwner || isManager;
  const canViewClientDetails = hasFullAccess || isServiceProvider;

  return {
    user: currentBarber
      ? { id: currentBarber.id, email: currentBarber.email, full_name: currentBarber.name, role: permissionLevel }
      : null,
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
