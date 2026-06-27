import { useAuth } from '@/lib/AuthContext';

export function usePermissions() {
  const { user, currentBarber, accessLevelPermissions } = useAuth();

  const permissionLevel = currentBarber?.permission_level ?? null;
  const isSuperAdmin = permissionLevel === 'superadmin';
  const isOwner = permissionLevel === 'owner' || permissionLevel === 'superadmin';
  // Platform-level tiers: no shop_id means this is a global account, not a shop employee
  const isOwnerTier = permissionLevel === 'owner';
  const isAdminTier = permissionLevel === 'superadmin' || isOwnerTier;
  const isManager = permissionLevel === 'manager';
  const isServiceProvider = permissionLevel === 'service_provider';
  const hasFullAccess = isOwner || isManager || isSuperAdmin;
  const canViewClientDetails = hasFullAccess || isServiceProvider;

  // Returns true if the current user's access level grants at least minValue for perm_key.
  // minValue: 'view' | 'modify' | 'modify_with_limit'
  function hasPermission(key, minValue = 'view') {
    const entry = accessLevelPermissions[key];
    const value = entry?.value ?? 'none';
    if (value === 'none') return false;
    if (minValue === 'view') return true;
    if (minValue === 'modify') return value === 'modify' || value === 'modify_with_limit';
    if (minValue === 'modify_with_limit') return value === 'modify_with_limit';
    return false;
  }

  // Returns the numeric cap for modify_with_limit permissions, or null if uncapped.
  function getPermissionLimit(key) {
    return accessLevelPermissions[key]?.limit ?? null;
  }

  return {
    user: currentBarber
      ? { id: currentBarber.id, email: currentBarber.email, full_name: currentBarber.name, role: permissionLevel }
      : null,
    isAdmin: isOwner || isSuperAdmin,
    isSuperAdmin,
    isOwner,
    isOwnerTier,
    isAdminTier,
    isManager,
    isServiceProvider,
    hasFullAccess,
    canViewClientDetails,
    permissionLevel,
    currentBarber,
    hasPermission,
    getPermissionLimit,
  };
}
