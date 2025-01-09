'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/app/lib/hooks/useWorkspace'
import { welcomeAgentUtils } from '@/app/lib/firebase/welcomeAgentUtils'
import { WelcomeAgent } from '@/app/lib/types/welcome-agent'
import { Button } from '@/app/components/common/button'
import { Plus, Settings, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/app/components/common/badge'
import { useToast } from '@/app/components/common/use-toast'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/common/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/common/alert-dialog"

export default function WelcomeAgentList() {
  const router = useRouter()
  const { workspace, loading: workspaceLoading } = useWorkspace()
  const { toast } = useToast()
  const [agents, setAgents] = useState<WelcomeAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<WelcomeAgent | null>(null)

  useEffect(() => {
    const loadAgents = async () => {
      // Don't try to load agents until workspace is loaded
      if (workspaceLoading) return
      
      // If no workspace after loading, show error
      if (!workspace?.id) {
        setLoading(false)
        toast({
          title: "Error",
          description: "No workspace selected",
          variant: "destructive"
        })
        return
      }

      try {
        console.log('Loading agents for workspace:', workspace.id)
        const loadedAgents = await welcomeAgentUtils.getWorkspaceWelcomeAgents(workspace.id)
        console.log('Loaded agents:', loadedAgents)
        setAgents(loadedAgents)
      } catch (error) {
        console.error('Error loading welcome agents:', error)
        toast({
          title: "Error",
          description: "Failed to load welcome agents",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadAgents()
  }, [workspace?.id, workspaceLoading, toast])

  // Show loading state while workspace is loading
  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading workspace...</p>
        </div>
      </div>
    )
  }

  // Show error if no workspace
  if (!workspace?.id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">No Workspace Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Please select a workspace to view welcome agents.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state while agents are loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading welcome agents...</p>
        </div>
      </div>
    )
  }

  const handleDeleteClick = (agent: WelcomeAgent) => {
    setAgentToDelete(agent)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!agentToDelete?.id) return

    try {
      await welcomeAgentUtils.deleteWelcomeAgent(agentToDelete.id)
      setAgents(agents.filter(agent => agent.id !== agentToDelete.id))
      toast({
        title: "Success",
        description: "Welcome agent deleted",
        variant: "default"
      })
    } catch (error) {
      console.error('Error deleting welcome agent:', error)
      toast({
        title: "Error",
        description: "Failed to delete welcome agent",
        variant: "destructive"
      })
    } finally {
      setDeleteDialogOpen(false)
      setAgentToDelete(null)
    }
  }

  // Update the edit button to navigate to the edit page with state
  const handleEdit = (agent: WelcomeAgent) => {
    router.push(`/welcome-agent/new?edit=${agent.id}`)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome Agents</h1>
          <p className="text-gray-500 mt-1">
            Create and manage your automated welcome emails
          </p>
        </div>
        <Button onClick={() => router.push('/welcome-agent/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Welcome Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No welcome agents yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 mb-4">
              Create your first welcome agent to start automating your welcome emails.
            </p>
            <Button onClick={() => router.push('/welcome-agent/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Welcome Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{agent.name}</CardTitle>
                    <p className="text-gray-500 mt-2">
                      {agent.emailPurpose.directive.substring(0, 100)}...
                    </p>
                  </div>
                  <Badge variant={agent.status === 'published' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(agent)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteClick(agent)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the welcome agent "{agentToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

