import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '@/app/lib/contexts/AuthContext'
import { User, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/app/lib/firebase/firebase'

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
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

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return {
    user: context.user,
    loading: context.loading,
    isReady,
    signInWithGoogle,
    signOut
  }
}