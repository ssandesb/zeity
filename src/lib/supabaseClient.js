import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey)
}

export const NOTE_IMG_BASE = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/klary/note/`
  : ''
