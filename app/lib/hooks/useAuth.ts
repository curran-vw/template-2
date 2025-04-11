import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebase/firebase'
import { useWorkspace } from './useWorkspace'

interface UseAuthReturn {
  user: User | null
  loading: boolean
  isReady: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext)
  const { refreshWorkspaces } = useWorkspace()
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
      console.log('Starting Google sign-in process')
      const result = await signInWithPopup(auth, provider)
      console.log('Google sign-in successful, user:', result.user.uid)

      // Trigger a workspace refresh after sign-in to fetch any newly created workspaces
      setTimeout(async () => {
        console.log('Refreshing workspaces after sign-in')
        await refreshWorkspaces()
      }, 2000) // Small delay to ensure Firebase has time to create the workspace
    } catch (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  const signOut = async () => {
    try {
      console.log('Signing out user')
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
    signOut,
  }
}
