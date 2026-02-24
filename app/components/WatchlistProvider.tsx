'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthProvider'
import { getSupabaseBrowser } from '@/lib/supabase'

type WatchlistContextType = {
  watchedIds: Set<number>
  watchlistLoading: boolean
  addWatch: (billId: number) => Promise<boolean>
  removeWatch: (billId: number) => Promise<boolean>
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchedIds: new Set(),
  watchlistLoading: false,
  addWatch: async () => false,
  removeWatch: async () => false,
})

export function useWatchlist() {
  return useContext(WatchlistContext)
}

export default function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set())
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  // Fetch all watched bill IDs once when the user is known — replaces per-card queries
  useEffect(() => {
    if (loading) return
    if (!user) {
      setWatchedIds(new Set())
      return
    }

    setWatchlistLoading(true)
    const supabase = getSupabaseBrowser()
    supabase
      .from('user_bills')
      .select('bill_id')
      .eq('user_id', user.id)
      .then(({ data }: { data: { bill_id: number }[] | null }) => {
        const ids = new Set<number>(
          (data ?? []).map((r) => Number(r.bill_id)).filter(Boolean)
        )
        setWatchedIds(ids)
      })
      .catch(() => {})
      .finally(() => setWatchlistLoading(false))
  }, [user?.id, loading])

  const addWatch = useCallback(async (billId: number): Promise<boolean> => {
    if (!user) return false
    const supabase = getSupabaseBrowser()
    const { error } = await supabase
      .from('user_bills')
      .upsert({ user_id: user.id, bill_id: billId }, { onConflict: 'user_id,bill_id' })
    if (!error) {
      setWatchedIds(prev => new Set([...prev, billId]))
      return true
    }
    return false
  }, [user?.id])

  const removeWatch = useCallback(async (billId: number): Promise<boolean> => {
    if (!user) return false
    const supabase = getSupabaseBrowser()
    const { error } = await supabase
      .from('user_bills')
      .delete()
      .eq('user_id', user.id)
      .eq('bill_id', billId)
    if (!error) {
      setWatchedIds(prev => {
        const next = new Set(prev)
        next.delete(billId)
        return next
      })
      return true
    }
    return false
  }, [user?.id])

  return (
    <WatchlistContext.Provider value={{ watchedIds, watchlistLoading, addWatch, removeWatch }}>
      {children}
    </WatchlistContext.Provider>
  )
}
