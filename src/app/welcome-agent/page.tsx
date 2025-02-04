'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/app/lib/hooks/useWorkspace'
import { welcomeAgentUtils } from '@/app/lib/firebase/welcomeAgentUtils'
import { WelcomeAgent } from '@/app/lib/types/welcome-agent'
import { Button } from '@/app/components/common/button'
import { PlusCircle, Mail, Zap, Clock, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/common/use-toast'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/common/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/common/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/common/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/common/alert-dialog"

function EmptyState() {
  const router = useRouter()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 border-2 border-dashed border-gray-200 rounded-lg">
      <div className="w-24 h-24">
        <RobotAnimation />
      </div>
      <h2 className="text-2xl font-semibold text-center mb-3">
        No welcome agents yet
      </h2>
      <p className="text-gray-500 text-center mb-8 max-w-md">
        Create your first welcome agent to start automating your personalized welcome emails
      </p>
      <Button 
        size="lg" 
        className="gap-2"
        onClick={() => router.push('/welcome-agent/new')}
      >
        <PlusCircle className="h-5 w-5" />
        Create Your First Agent
      </Button>
    </div>
  )
}

function RobotAnimation() {
  return (
    <div className="robot-animation">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Robot head */}
        <rect className="robot-head" x="60" y="60" width="80" height="80" rx="10" fill="#e2e8f0" />
        {/* Robot eyes container */}
        <g className="robot-eyes">
          <circle cx="85" cy="90" r="8" fill="#e2e8f0" /> {/* Eye sockets */}
          <circle cx="115" cy="90" r="8" fill="#e2e8f0" />
          <circle className="robot-eye" cx="85" cy="90" r="6" fill="#3b82f6" /> {/* Actual eyes */}
          <circle className="robot-eye" cx="115" cy="90" r="6" fill="#3b82f6" />
        </g>
        {/* Robot antenna */}
        <line className="robot-antenna" x1="100" y1="60" x2="100" y2="40" stroke="#94a3b8" strokeWidth="4" />
        <circle className="robot-antenna-tip" cx="100" cy="35" r="6" fill="#3b82f6" />
      </svg>
      <style jsx>{`
        .robot-animation {
          animation: float 3s ease-in-out infinite;
        }
        .robot-eye {
          transform-origin: center;
          animation: blink 4s infinite;
        }
        .robot-antenna-tip {
          animation: pulse 2s infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes blink {
          0%, 96%, 98% { transform: scaleY(1); }
          97% { transform: scaleY(0.1); }
        }
        @keyframes pulse {
          0%, 100% { fill: #3b82f6; }
          50% { fill: #60a5fa; }
        }
      `}</style>
    </div>
  )
}

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
  }, [workspace?.id, toast, workspaceLoading])

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

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome Agents</h1>
            <p className="text-gray-500">
              Create and manage your automated welcome agents
            </p>
          </div>
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => router.push('/welcome-agent/new')}
          >
            <PlusCircle className="h-5 w-5" />
            New Welcome Agent
          </Button>
        </div>

        {agents.length === 0 ? (
          <EmptyState />
        ) : (
          <Tabs defaultValue="all" className="space-y-8">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                <Mail className="h-4 w-4" />
                All Agents
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-2">
                <Zap className="h-4 w-4" />
                Active
              </TabsTrigger>
              <TabsTrigger value="draft" className="gap-2">
                <Clock className="h-4 w-4" />
                Drafts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent}
                    onEdit={() => router.push(`/welcome-agent/new?edit=${agent.id}`)}
                    onDelete={() => handleDeleteClick(agent)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="active">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {agents
                  .filter(agent => agent.status === 'published')
                  .map((agent) => (
                    <AgentCard 
                      key={agent.id} 
                      agent={agent}
                      onEdit={() => router.push(`/welcome-agent/new?edit=${agent.id}`)}
                      onDelete={() => handleDeleteClick(agent)}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="draft">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {agents
                  .filter(agent => agent.status === 'draft')
                  .map((agent) => (
                    <AgentCard 
                      key={agent.id} 
                      agent={agent}
                      onEdit={() => router.push(`/welcome-agent/new?edit=${agent.id}`)}
                      onDelete={() => handleDeleteClick(agent)}
                    />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the welcome agent &quot;{agentToDelete?.name}&quot;.
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

function AgentCard({ agent, onEdit, onDelete }: { 
  agent: WelcomeAgent
  onEdit: () => void
  onDelete: () => void 
}) {
  const router = useRouter()

  const handleEmailClick = () => {
    router.push(`/welcome-agent/new?edit=${agent.id}&configure=true`)
  }

  const handleEmailHistory = () => {
    if (agent.id) {
      console.log('Navigating to email history for agent:', agent.id)
      router.push(`/email-history?agentId=${agent.id}`)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-1 space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <CardTitle 
            className="line-clamp-1 text-lg cursor-pointer hover:text-gray-600 transition-colors"
            onClick={onEdit}
          >
            {agent.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEmailHistory}>
                View Email History
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-2">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 rounded-full text-xs font-normal hover:bg-gray-50"
              onClick={handleEmailClick}
            >
              <GoogleIcon className="h-4 w-4" />
              {agent.configuration?.emailAccount || "No email attached"}
            </Button>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2">
            {agent.emailPurpose?.directive || "No directive set"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${agent.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm capitalize">{agent.status === 'published' ? 'active' : 'draft'}</span>
          </div>
          {agent.status === 'published' && agent.emailsSentToday !== undefined && (
            <div className="text-sm text-gray-500">
              {agent.emailsSentToday} emails sent today
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="1em" height="1em" {...props}>
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  )
}

