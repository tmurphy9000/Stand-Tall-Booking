import { supabase } from '@/lib/supabaseClient';

function createEntity(tableName) {
  return {
    async list(sortField, limit) {
      let query = supabase.from(tableName).select('*');
      if (sortField) {
        const descending = sortField.startsWith('-');
        const column = descending ? sortField.slice(1) : sortField;
        query = query.order(column, { ascending: !descending });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },

    async filter(queryObj, sortField) {
      let query = supabase.from(tableName).select('*');
      for (const [key, value] of Object.entries(queryObj)) {
        if (value !== null && typeof value === 'object') {
          if ('$in' in value) query = query.in(key, value.$in);
          if ('$gte' in value) query = query.gte(key, value.$gte);
          if ('$lte' in value) query = query.lte(key, value.$lte);
          if ('$gt' in value) query = query.gt(key, value.$gt);
          if ('$lt' in value) query = query.lt(key, value.$lt);
        } else {
          query = query.eq(key, value);
        }
      }
      if (sortField) {
        const descending = sortField.startsWith('-');
        const column = descending ? sortField.slice(1) : sortField;
        query = query.order(column, { ascending: !descending });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async create(record) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },

    async bulkCreate(records) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(records)
        .select();
      if (error) throw error;
      return data ?? [];
    },
  };
}

export const entities = {
  Barber: createEntity('barbers'),
  Booking: createEntity('bookings'),
  Client: createEntity('clients'),
  Service: createEntity('services'),
  ShopSettings: createEntity('shop_settings'),
  CashTransaction: createEntity('cash_transactions'),
  Discount: createEntity('discounts'),
  Product: createEntity('products'),
  InventoryAdjustment: createEntity('inventory_adjustments'),
  Notification: createEntity('notifications'),
  Review: createEntity('reviews'),
  RolePermissions: createEntity('role_permissions'),
  BarberPassword: createEntity('barber_passwords'),
  BarberSensitiveInfo: createEntity('barber_sensitive_info'),
  TimeOffRequest: createEntity('time_off_requests'),
  User: createEntity('users'),
};
