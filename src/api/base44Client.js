// Base44 SDK has been removed. All data access now goes through:
//   src/api/entities.js  — Supabase CRUD wrappers
//   src/api/auth.js      — Supabase + localStorage auth
//   src/api/functions.js — Cloud function implementations
//
// If you see this file imported anywhere, update that import.
export const base44 = null;
