import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '@/app/lib/contexts/AuthContext'
import { User } from 'firebase/auth'

export function useAuth() {
  const context = useContext(AuthContext)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (context && !context.loading) {
      setIsReady(true)
    }
  }, [context])

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return {
    user: context.user,
    loading: context.loading,
    isReady
  }
}