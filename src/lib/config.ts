export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const hasSupabase =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY) && SUPABASE_URL.startsWith('http')

/**
 * Demo mode runs entirely in this browser tab.
 * Data is NOT authenticated and NOT securely persisted — it is stored in
 * localStorage so the full event lifecycle can be walked through locally.
 */
export const DEMO_MODE = !hasSupabase

export const MODE_LABEL = DEMO_MODE ? 'Local demo mode' : 'Supabase connected'
