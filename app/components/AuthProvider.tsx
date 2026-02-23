'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = getSupabaseBrowser()

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!isMounted) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
      } catch (err) {
        console.error('Error initializing auth session:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}