import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Raw Supabase client — exported for auth subscriptions and other Supabase-native usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------------
// Table name registry
// Maps Base44 PascalCase entity names to Supabase table names.
// ---------------------------------------------------------------------------
const ENTITY_TABLE_MAP = {
  Barber:               'barbers',
  BarberSensitiveInfo:  'barber_sensitive_info',
  Booking:              'bookings',
  Client:               'clients',
  Service:              'services',
  Product:              'products',
  CashTransaction:      'cash_transactions',
  Discount:             'discounts',
  ShopSettings:         'shop_settings',
  Notification:         'notifications',
  TimeOffRequest:       'time_off_requests',
  User:                 'users',
  RolePermissions:      'role_permissions',
  Review:               'reviews',
  InventoryAdjustment:  'inventory_adjustments',
};

// Fallback: PascalCase → snake_case (+ trailing 's') for unknown entities
function deriveTableName(entityName) {
  const snake = entityName.replace(/([A-Z])/g, (m, l, i) => i === 0 ? l.toLowerCase() : `_${l.toLowerCase()}`);
  return snake.endsWith('s') ? snake : `${snake}s`;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

function applySortBy(query, sortBy) {
  if (!sortBy) return query;
  const ascending = !sortBy.startsWith('-');
  const column = ascending ? sortBy : sortBy.slice(1);
  return query.order(column, { ascending });
}

// Translates MongoDB-style operators to Supabase query methods.
// Supports: $gte, $lte, $gt, $lt, $eq, $ne, $in
function applyFilter(query, filterObj) {
  for (const [key, value] of Object.entries(filterObj)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      if ('$gte' in value) query = query.gte(key, value.$gte);
      if ('$lte' in value) query = query.lte(key, value.$lte);
      if ('$gt'  in value) query = query.gt(key,  value.$gt);
      if ('$lt'  in value) query = query.lt(key,  value.$lt);
      if ('$eq'  in value) query = query.eq(key,  value.$eq);
      if ('$ne'  in value) query = query.neq(key, value.$ne);
      if ('$in'  in value) query = query.in(key,  value.$in);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function throwOnError(error) {
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Entity API factory — matches Base44's entity method signatures exactly:
//   .list(sortBy?, limit?)
//   .filter(filterObj, sortBy?)
//   .create(data)
//   .update(id, data)
//   .delete(id)
//   .bulkCreate(records)
// ---------------------------------------------------------------------------
function createEntityApi(tableName) {
  return {
    async list(sortBy, limit) {
      let query = supabase.from(tableName).select('*');
      query = applySortBy(query, sortBy);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      throwOnError(error);
      return data;
    },

    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      throwOnError(error);
      return data;
    },

    async filter(filterObj, sortBy) {
      let query = supabase.from(tableName).select('*');
      query = applyFilter(query, filterObj);
      query = applySortBy(query, sortBy);
      const { data, error } = await query;
      throwOnError(error);
      return data;
    },

    async create(data) {
      const { data: result, error } = await supabase.from(tableName).insert(data).select().single();
      throwOnError(error);
      return result;
    },

    async update(id, data) {
      const { data: result, error } = await supabase.from(tableName).update(data).eq('id', id).select().single();
      throwOnError(error);
      return result;
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      throwOnError(error);
    },

    async bulkCreate(records) {
      const { data: result, error } = await supabase.from(tableName).insert(records).select();
      throwOnError(error);
      return result;
    },
  };
}

// Proxy-based entities namespace: supabaseClient.entities.Barber.list(), etc.
// Unknown entity names fall back to auto-derived table names.
const entities = new Proxy({}, {
  get(_, entityName) {
    const tableName = ENTITY_TABLE_MAP[entityName] ?? deriveTableName(entityName);
    return createEntityApi(tableName);
  },
});

// ---------------------------------------------------------------------------
// Auth API — mirrors base44.auth.*
// Note: Supabase auth uses email/password or OAuth; the barber custom-login
// flow (base44.functions.invoke("barberLogin")) is handled under `functions`.
// ---------------------------------------------------------------------------
const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    throwOnError(error);
    return user;
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    throwOnError(error);
    return data.user;
  },

  async logout(redirectUrl) {
    const { error } = await supabase.auth.signOut();
    throwOnError(error);
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin(redirectUrl) {
    const dest = redirectUrl
      ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
      : '/login';
    window.location.href = dest;
  },
};

// ---------------------------------------------------------------------------
// Functions API — mirrors base44.functions.invoke(name, params)
// Routes to Supabase Edge Functions by the same name.
// Functions in use: createStripePayment, barberLogin, changeBarberPassword,
//   gustoPayroll, syncBarberAccounts, sendEmail, extractFileData
// ---------------------------------------------------------------------------
const functions = {
  async invoke(functionName, params) {
    const { data, error } = await supabase.functions.invoke(functionName, { body: params });
    throwOnError(error);
    return { data };
  },
};

// ---------------------------------------------------------------------------
// Integrations API — mirrors base44.integrations.Core.*
// ---------------------------------------------------------------------------
const integrations = {
  Core: {
    // Uploads to the Supabase 'uploads' storage bucket; returns { file_url }
    async UploadFile({ file }) {
      const ext = file.name.split('.').pop();
      const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file);
      throwOnError(error);
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      return { file_url: publicUrl };
    },

    // Delegates to a 'sendEmail' Edge Function
    async SendEmail({ to, subject, body }) {
      return functions.invoke('sendEmail', { to, subject, body });
    },

    // Delegates to an 'extractFileData' Edge Function for server-side CSV parsing
    async ExtractDataFromUploadedFile({ file_path, format }) {
      return functions.invoke('extractFileData', { file_path, format });
    },
  },
};

// ---------------------------------------------------------------------------
// Unified client export — drop-in API-shape replacement for `base44`
// Exported as both `supabaseClient` and `base44` so existing imports work.
// ---------------------------------------------------------------------------
export const supabaseClient = { entities, auth, functions, integrations };
export const base44 = supabaseClient;
