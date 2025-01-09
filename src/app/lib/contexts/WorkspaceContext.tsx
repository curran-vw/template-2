'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth } from '@/app/lib/firebase/firebase'
import { db } from '@/app/lib/firebase/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

const WORKSPACE_STORAGE_KEY = 'lastSelectedWorkspaceId'

export interface Workspace {
  id: string
  name: string
  ownerId: string
  members: string[]
  createdAt: number
}

interface WorkspaceContextType {
  workspace: Workspace | null
  setWorkspace: (workspace: Workspace | null) => void
  workspaces: Workspace[]
  loading: boolean
  error: Error | null
  refreshWorkspaces: () => void
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

  // Wrapper for setWorkspace that also updates localStorage
  const setWorkspace = useCallback((newWorkspace: Workspace | null) => {
    setWorkspaceState(newWorkspace)
    if (newWorkspace?.id) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, newWorkspace.id)
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY)
    }
  }, [])

  const loadWorkspaces = useCallback(async (userId: string) => {
    try {
      console.log('Loading workspaces for user:', userId)
      const workspacesQuery = query(
        collection(db, 'workspaces'),
        where('members', 'array-contains', userId)
      )
      const querySnapshot = await getDocs(workspacesQuery)
      const workspacesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Workspace[]
      
      console.log('Loaded workspaces:', workspacesList)
      setWorkspaces(workspacesList)

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
        }
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

  useEffect(() => {
    console.log('WorkspaceProvider: Setting up auth listener')
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('WorkspaceProvider: Auth state changed', { user })
      if (user) {
        await loadWorkspaces(user.uid)
      } else {
        console.log('WorkspaceProvider: No user, clearing workspaces')
        setWorkspaces([])
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