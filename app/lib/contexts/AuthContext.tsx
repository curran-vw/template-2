'use client'

import { createContext, useEffect, useState, useCallback } from 'react'
import { User } from 'firebase/auth'
import { auth } from '../firebase/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { createWorkspace } from '../firebase/workspaceUtils'
import { db } from '../firebase/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

interface AuthContextType {
  user: User | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Track if we've checked workspace creation for the current user
  const [checkedWorkspace, setCheckedWorkspace] = useState<string | null>(null)

  // Check if a user is new (has no workspaces) and create a default one if needed
  const checkAndCreateDefaultWorkspace = useCallback(
    async (user: User) => {
      // Skip if we've already checked for this user
      if (checkedWorkspace === user.uid) {
        console.log('Already checked workspace for user:', user.uid)
        return
      }

      console.log('Checking if user needs a default workspace:', user.uid)
      try {
        // Check if the user already has workspaces
        const workspacesQuery = query(
          collection(db, 'workspaces'),
          where('members', 'array-contains', user.uid),
        )
        const querySnapshot = await getDocs(workspacesQuery)

        // If user has no workspaces, create a default one for them
        if (querySnapshot.empty) {
          console.log(
            'New user detected, creating default workspace for:',
            user.uid,
          )
          const displayName = user.displayName || 'User'
          const workspaceName = `${displayName}'s Workspace`

          try {
            const workspace = await createWorkspace(workspaceName, user.uid)
            console.log('Default workspace created successfully:', workspace)
            // Mark that we've checked workspace creation for this user
            setCheckedWorkspace(user.uid)
          } catch (createError) {
            console.error('Error creating default workspace:', createError)
          }
        } else {
          console.log('User already has workspaces, count:', querySnapshot.size)
          // Mark that we've checked workspace creation for this user
          setCheckedWorkspace(user.uid)
        }
      } catch (err) {
        console.error('Error checking workspaces:', err)
      }
    },
    [checkedWorkspace],
  )

  useEffect(() => {
    // Additional check for current user on component mount
    // This helps ensure workspace creation in case the auth state change event was missed
    const checkCurrentUser = async () => {
      const currentUser = auth.currentUser
      if (currentUser && checkedWorkspace !== currentUser.uid) {
        console.log(
          'Checking workspace for current user on mount:',
          currentUser.uid,
        )
        await checkAndCreateDefaultWorkspace(currentUser)
      }
    }

    checkCurrentUser()
  }, [checkedWorkspace, checkAndCreateDefaultWorkspace])

  useEffect(() => {
    console.log('Setting up auth listener...')
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log('Auth state changed:', authUser?.uid)

      if (authUser) {
        // Set the user first so the UI can update
        setUser(authUser)

        // Then create a workspace if needed
        // We do this asynchronously to not block the UI
        setTimeout(() => {
          checkAndCreateDefaultWorkspace(authUser)
        }, 1000) // Small delay to ensure Firestore is ready
      } else {
        setUser(null)
        setCheckedWorkspace(null)
      }

      setLoading(false)
    })

    return () => {
      console.log('Cleaning up auth listener...')
      unsubscribe()
    }
  }, [checkAndCreateDefaultWorkspace]) // Include checkAndCreateDefaultWorkspace in dependencies

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
