import { supabase } from '@/lib/supabaseClient';
import { entities } from '@/api/entities';

const hashPassword = (pwd) => btoa(pwd);

export const functions = {
  async invoke(name, payload) {
    switch (name) {
      case 'barberLogin': {
        const { email, password } = payload;
        const barbers = await entities.Barber.filter({ email });
        if (!barbers.length) {
          throw { response: { data: { error: 'Invalid email or password' } } };
        }
        const barber = barbers[0];
        const passwords = await entities.BarberPassword.filter({ barber_id: barber.id });
        if (!passwords.length || hashPassword(password) !== passwords[0].password_hash) {
          throw { response: { data: { error: 'Invalid email or password' } } };
        }
        return {
          data: {
            success: true,
            barber_id: barber.id,
            barber_name: barber.name,
            email: barber.email,
            is_temp: passwords[0].is_temp,
          },
        };
      }

      case 'changeBarberPassword': {
        const { barber_id, old_password, new_password } = payload;
        const passwords = await entities.BarberPassword.filter({ barber_id });
        if (!passwords.length) {
          throw { response: { data: { error: 'Password record not found' } } };
        }
        if (hashPassword(old_password) !== passwords[0].password_hash) {
          throw { response: { data: { error: 'Current password is incorrect' } } };
        }
        await entities.BarberPassword.update(passwords[0].id, {
          password_hash: hashPassword(new_password),
          is_temp: false,
        });
        return { data: { success: true } };
      }

      case 'createStripePayment': {
        const { data, error } = await supabase.functions.invoke('createStripePayment', {
          body: payload,
        });
        if (error) throw error;
        return { data };
      }

      case 'gustoPayroll': {
        const { data, error } = await supabase.functions.invoke('gustoPayroll', {
          body: payload,
        });
        if (error) throw error;
        return { data };
      }

      case 'syncBarberAccounts': {
        const { barber_name, user_id, email } = payload;
        const allBarbers = await entities.Barber.filter({});
        const matching = allBarbers.filter(
          b => b.name?.toLowerCase() === barber_name?.toLowerCase() && !b.user_id
        );
        let updated = 0;
        for (const barber of matching) {
          await entities.Barber.update(barber.id, { user_id, email });
          updated++;
        }
        return { data: { success: true, updated } };
      }

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  },
};
