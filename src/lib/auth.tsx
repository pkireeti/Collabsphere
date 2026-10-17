import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from './api'
import type { Profile } from './types'

interface AuthValue {
  user: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<Profile>
  signUp: (input: {
    full_name: string
    email: string
    password: string
    house: string
    city: string
    role: Profile['role']
  }) => Promise<Profile>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const s = await api.currentSession()
      setUser(s)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let alive = true
    api
      .currentSession()
      .then((s) => {
        if (alive) setUser(s)
      })
      .catch(() => {
        if (alive) setUser(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // keep the cached profile fresh on cross-tab sign-out / token refresh
  useEffect(() => api.subscribeAuth(() => void refresh()), [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    const p = await api.signIn(email, password)
    setUser(p)
    return p
  }, [])

  const signUp = useCallback<AuthValue['signUp']>(async (input) => {
    const p = await api.signUp(input)
    setUser(p)
    return p
  }, [])

  const signOut = useCallback(async () => {
    await api.signOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
