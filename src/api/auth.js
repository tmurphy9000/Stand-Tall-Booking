import { supabase } from '@/lib/supabaseClient';

export const auth = {
  async me() {
    const barberSession = localStorage.getItem('barber_session');
    if (barberSession) {
      const barber = JSON.parse(barberSession);
      return {
        id: barber.barber_id,
        email: barber.email,
        full_name: barber.barber_name,
        role: 'barber',
      };
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not authenticated');
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      role: user.user_metadata?.role || 'admin',
    };
  },

  async logout(redirectUrl) {
    localStorage.removeItem('barber_session');
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin() {
    window.location.href = '/barber-login';
  },
};
