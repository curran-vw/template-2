'use client'

import { createContext, useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { auth } from '@/app/lib/firebase/firebase'
import { onAuthStateChanged } from 'firebase/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('Setting up auth listener...')
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user?.uid)
      setUser(user)
      setLoading(false)
    })

    return () => {
      console.log('Cleaning up auth listener...')
      unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
} 