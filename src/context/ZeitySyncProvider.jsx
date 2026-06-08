import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  ZEITY_DB_EVENT,
  ZEITY_DB_ROW_ID,
  ZEITY_DB_TABLE,
  fetchZeityDb,
  hydrateZeityDb,
  shouldIgnoreRemoteEvent,
} from '../lib/zeityDb'

const ZeitySyncContext = createContext({ ready: false, version: 0 })

export function useZeitySync() {
  return useContext(ZeitySyncContext)
}

export default function ZeitySyncProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    hydrateZeityDb().then(() => {
      if (!cancelled) {
        setReady(true)
        setVersion((v) => v + 1)
      }
    })

    const bump = () => setVersion((v) => v + 1)
    window.addEventListener(ZEITY_DB_EVENT, bump)

    let channel = null
    if (supabase) {
      channel = supabase
        .channel('zeity_db_sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: ZEITY_DB_TABLE,
            filter: `id=eq.${ZEITY_DB_ROW_ID}`,
          },
          async () => {
            if (shouldIgnoreRemoteEvent()) return
            await fetchZeityDb({ force: true })
            setVersion((v) => v + 1)
          },
        )
        .subscribe()
    }

    return () => {
      cancelled = true
      window.removeEventListener(ZEITY_DB_EVENT, bump)
      if (channel && supabase) supabase.removeChannel(channel)
    }
  }, [])

  if (!ready) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p className="page-sub">Loading Zeity…</p>
      </div>
    )
  }

  return (
    <ZeitySyncContext.Provider value={{ ready, version }}>
      {children}
    </ZeitySyncContext.Provider>
  )
}
