import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [currentBarber, setCurrentBarber] = useState(null);
  const [accessLevelPermissions, setAccessLevelPermissions] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const loadAccessLevelPermissions = async (accessLevelId) => {
    if (!accessLevelId) {
      setAccessLevelPermissions({});
      return;
    }
    const { data } = await supabase
      .from('access_level_permissions')
      .select('permission_key, permission_value, limit_value')
      .eq('access_level_id', accessLevelId);
    const map = {};
    data?.forEach(p => {
      map[p.permission_key] = { value: p.permission_value ?? 'none', limit: p.limit_value ?? null };
    });
    setAccessLevelPermissions(map);
  };

  const fetchBarber = async (userId, email) => {
    console.log('[AuthContext] fetchBarber — user_id:', userId, '| email:', email);

    // Primary: match by auth UID (consistent with RLS policies)
    const { data: byId, error: idError } = await supabase
      .from('barbers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    console.log('[AuthContext] lookup by user_id:', byId, '| error:', idError);

    if (byId) {
      setCurrentBarber(byId);
      await loadAccessLevelPermissions(byId.access_level_id);
      return;
    }

    // Fallback: match by email (for barber rows without user_id populated)
    const { data: byEmail, error: emailError } = await supabase
      .from('barbers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    console.log('[AuthContext] lookup by email:', byEmail, '| error:', emailError);
    setCurrentBarber(byEmail ?? null);
    await loadAccessLevelPermissions(byEmail?.access_level_id ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        fetchBarber(session.user.id, session.user.email);
      } else {
        setIsLoadingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        fetchBarber(session.user.id, session.user.email).then(() => setIsLoadingAuth(false));
      } else {
        setUser(null);
        setCurrentBarber(null);
        setAccessLevelPermissions({});
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentBarber(null);
    setAccessLevelPermissions({});
    setIsAuthenticated(false);
    window.location.href = '/barber-login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      currentBarber,
      accessLevelPermissions,
      isAuthenticated,
      isLoadingAuth,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
