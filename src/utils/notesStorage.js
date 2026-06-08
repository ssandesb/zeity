import { supabase } from '../lib/supabaseClient'

const TABLE = 'klary_notes'

export async function fetchNoteRow(dateKey) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('date_key, note_text, highlights')
      .eq('date_key', dateKey)
      .maybeSingle()
    if (error) throw error
    return data
  } catch (e) {
    console.error('fetchNoteRow error:', e)
    return null
  }
}

export async function fetchNoteRows(dateKeys) {
  if (!supabase || !dateKeys?.length) return {}
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('date_key, note_text, highlights')
      .in('date_key', dateKeys)
    if (error) throw error
    const map = {}
    for (const row of data || []) {
      map[row.date_key] = row
    }
    return map
  } catch (e) {
    console.error('fetchNoteRows error:', e)
    return {}
  }
}

export async function saveNoteText(dateKey, noteText) {
  if (!supabase) return false
  try {
    const { error } = await supabase.from(TABLE).upsert(
      { date_key: dateKey, note_text: noteText },
      { onConflict: 'date_key' },
    )
    if (error) throw error
    return true
  } catch (e) {
    console.error('saveNoteText error:', e)
    return false
  }
}

export async function hasNotesBefore(dateKey) {
  if (!supabase) return false
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('date_key')
      .lt('date_key', dateKey)
      .not('note_text', 'is', null)
      .neq('note_text', '')
      .order('date_key', { ascending: false })
      .limit(1)
    if (error) throw error
    return (data?.length ?? 0) > 0
  } catch (e) {
    console.error('hasNotesBefore error:', e)
    return false
  }
}
