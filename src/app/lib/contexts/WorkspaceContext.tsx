'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth } from '@/app/lib/firebase/firebase'
import { db } from '@/app/lib/firebase/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { Workspace } from '@/lib/types/workspace'

const WORKSPACE_STORAGE_KEY = 'lastSelectedWorkspaceId'

interface WorkspaceContextType {
  workspace: Workspace | null
  setWorkspace: (workspace: Workspace | null) => void
  workspaces: Workspace[]
  loading: boolean
  error: Error | null
  refreshWorkspaces: () => Promise<void>
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  // Track if we've loaded workspaces at least once
  const [hasLoadedWorkspaces, setHasLoadedWorkspaces] = useState(false)
  // Track the last time we loaded workspaces
  const [lastLoadTime, setLastLoadTime] = useState(0)

  // Wrapper for setWorkspace that also updates localStorage
  const setWorkspace = useCallback((newWorkspace: Workspace | null) => {
    // Ensure the user has access to this workspace before setting it
    if (newWorkspace && auth.currentUser) {
      // Only allow setting if user is a member of the workspace
      if (newWorkspace.members.includes(auth.currentUser.uid)) {
        setWorkspaceState(newWorkspace)
        if (newWorkspace.id) {
          localStorage.setItem(WORKSPACE_STORAGE_KEY, newWorkspace.id)
        }
      } else {
        console.error('Access denied: User is not a member of this workspace')
        return
      }
    } else if (newWorkspace === null) {
      setWorkspaceState(null)
      localStorage.removeItem(WORKSPACE_STORAGE_KEY)
    }
  }, [])

  const loadWorkspaces = useCallback(async (userId: string) => {
    try {
      console.log('Loading workspaces for user:', userId)
      // Only get workspaces where the user is a member
      const workspacesQuery = query(
        collection(db, 'workspaces'),
        where('members', 'array-contains', userId)
      )
      const querySnapshot = await getDocs(workspacesQuery)
      const workspacesList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          ownerId: data.ownerId,
          members: data.members || [],
          createdAt: new Date(data.createdAt).toISOString()
        } as Workspace;
      })
      
      console.log('Loaded workspaces:', workspacesList)
      setWorkspaces(workspacesList)
      setHasLoadedWorkspaces(true)
      setLastLoadTime(Date.now())

      // Get the last selected workspace ID from localStorage
      const lastWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY)
      
      if (workspacesList.length > 0) {
        // Try to find the last selected workspace in the current list
        const lastWorkspace = lastWorkspaceId 
          ? workspacesList.find(w => w.id === lastWorkspaceId)
          : null

        // If the last workspace exists in the list, use it; otherwise use the first workspace
        if (!workspace) {
          setWorkspace(lastWorkspace || workspacesList[0])
        } else {
          // Verify current workspace is still valid for this user
          const isCurrentWorkspaceValid = workspacesList.some(w => 
            w.id === workspace.id && w.members.includes(userId)
          )
          
          if (!isCurrentWorkspaceValid) {
            // If current workspace is no longer valid, switch to another one
            setWorkspace(workspacesList[0])
          }
        }
      } else {
        // User has no workspaces, clear current workspace
        setWorkspace(null)
      }
    } catch (err) {
      console.error('Error loading workspaces:', err)
      setError(err instanceof Error ? err : new Error('Failed to load workspaces'))
    }
  }, [workspace, setWorkspace])

  // Add a function to refresh workspaces
  const refreshWorkspaces = useCallback(async () => {
    const user = auth.currentUser
    if (user) {
      await loadWorkspaces(user.uid)
    }
  }, [loadWorkspaces])

  // Set up a regular refresh interval for workspaces
  // useEffect(() => {
  //   const checkForWorkspaces = async () => {
  //     const user = auth.currentUser
  //     if (user) {
  //       // If it's been more than 2 seconds since we last loaded workspaces, or we haven't loaded them yet
  //       const now = Date.now()
  //       if (!hasLoadedWorkspaces || now - lastLoadTime > 2000) {
  //         console.log('Refreshing workspaces on interval check')
  //         await loadWorkspaces(user.uid)
  //       }
  //     }
  //   }

  //   // Check immediately and then every 3 seconds for new workspaces
  //   // This helps ensure we pick up any workspaces created in AuthContext
  //   const interval = setInterval(checkForWorkspaces, 3000)
  //   checkForWorkspaces()

  //   return () => clearInterval(interval)
  // }, [hasLoadedWorkspaces, lastLoadTime, loadWorkspaces])

  useEffect(() => {
    console.log('WorkspaceProvider: Setting up auth listener')
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('WorkspaceProvider: Auth state changed', { user })
      if (user) {
        await loadWorkspaces(user.uid)
      } else {
        console.log('WorkspaceProvider: No user, clearing workspaces')
        setWorkspaces([])
        setHasLoadedWorkspaces(false)
        // Don't clear the workspace here to persist it between sessions
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [loadWorkspaces])

  const value = React.useMemo(() => ({
    workspace,
    setWorkspace,
    workspaces,
    loading,
    error,
    refreshWorkspaces
  }), [workspace, workspaces, loading, error, refreshWorkspaces, setWorkspace])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
} 