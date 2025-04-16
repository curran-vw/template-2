"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Mail, Zap, Clock, MoreVertical, Info, Plus } from "lucide-react";
import { toast } from "sonner";

import { useWorkspace } from "@/hooks/use-workspace";
import * as welcomeAgentUtils from "@/firebase/welcome-agent-utils";
import type { WelcomeAgent } from "@/types/welcome-agent";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { AlertDialogDescription } from "@radix-ui/react-alert-dialog";
import EmptyWelcomeAgents from "@/components/empty-welcome-agents";
import UpgradePlanModal from "@/components/updgrade-plan-modal";

export default function WelcomeAgentList() {
  const router = useRouter();
  const { agents, agentsLoading } = useWorkspace();
  const { user, setUser } = useAuth();

  const [upgradePlanModalOpen, setUpgradePlanModalOpen] = useState(false);
  const handleAddAgent = () => {
    if (user && user.limits.agents > user.usage.agents) {
      router.push("/agents/new");
    } else {
      setUpgradePlanModalOpen(true);
    }
  };

  if (agentsLoading) {
    return (
      <div className='min-h-screen bg-background p-8'>
        <div className='mx-auto max-w-7xl'>
          <div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <Skeleton className='h-8 w-32' />
              <Skeleton className='mt-2 h-4 w-64' />
            </div>
            <Skeleton className='h-10 w-40' />
          </div>
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {[1, 2, 3].map((i) => (
              <Card key={i} className='flex flex-col'>
                <CardHeader className='flex-1 space-y-4 pb-6'>
                  <div className='flex items-center justify-between'>
                    <Skeleton className='h-6 w-32' />
                    <Skeleton className='h-8 w-8 rounded-full' />
                  </div>
                  <div className='space-y-2'>
                    <Skeleton className='h-8 w-48 rounded-full' />
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-3/4' />
                  </div>
                </CardHeader>
                <CardContent className='border-t pt-6'>
                  <div className='flex items-center justify-between'>
                    <Skeleton className='h-4 w-16' />
                    <Skeleton className='h-4 w-24' />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background p-8'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>My Agents</h1>
            <p className='text-muted-foreground'>Create and manage your automated welcome agents</p>
          </div>
          <Button onClick={() => handleAddAgent()} className='flex items-center gap-2'>
            <Plus className='h-4 w-4' />
            Add New Agent
          </Button>
        </div>

        {agents.length === 0 ? (
          <EmptyWelcomeAgents />
        ) : (
          <Tabs defaultValue='all' className='space-y-8'>
            <TabsList>
              <TabsTrigger value='all' className='gap-2'>
                <Mail className='h-4 w-4' />
                All Agents
                <span className='ml-1 rounded-full bg-muted px-2 py-0.5 text-xs'>
                  {agents.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value='active' className='gap-2'>
                <Zap className='h-4 w-4' />
                Active
                <span className='ml-1 rounded-full bg-muted px-2 py-0.5 text-xs'>
                  {agents.filter((agent) => agent.status === "published").length}
                </span>
              </TabsTrigger>
              <TabsTrigger value='draft' className='gap-2'>
                <Clock className='h-4 w-4' />
                Drafts
                <span className='ml-1 rounded-full bg-muted px-2 py-0.5 text-xs'>
                  {agents.filter((agent) => agent.status === "draft").length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value='all' className='space-y-8'>
              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value='active'>
              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {agents
                  .filter((agent) => agent.status === "published")
                  .map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value='draft'>
              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {agents
                  .filter((agent) => agent.status === "draft")
                  .map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <UpgradePlanModal
        title='Upgrade to add more agents'
        description='You have reached the maximum number of agents for your plan. Please upgrade to add more agents.'
        isOpen={upgradePlanModalOpen}
        setIsOpen={setUpgradePlanModalOpen}
      />
    </div>
  );
}

function AgentCard({ agent }: { agent: WelcomeAgent }) {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { agents, setAgents } = useWorkspace();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEmailClick = () => {
    router.push(`/agents/${agent.id}`);
  };

  const handleEmailHistory = () => {
    if (agent.id) {
      router.push(`/email-history?agentId=${agent.id}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user) return;

    setIsDeleting(true);
    const { success, error } = await welcomeAgentUtils.deleteWelcomeAgent({
      agentId: agent.id,
    });

    if (error) {
      toast.error("Error", {
        description: error,
      });
    } else if (success) {
      toast.success("Success", {
        description: "Welcome agent deleted successfully",
      });
      setAgents(agents.filter((a) => a.id !== agent.id));
      setUser({ ...user, usage: { ...user.usage, agents: user.usage.agents - 1 } });
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  return (
    <Card className='flex flex-col transition-all duration-200 hover:shadow-md'>
      <CardHeader className='flex-1 space-y-4 pb-6'>
        <div className='flex items-center justify-between'>
          <CardTitle
            className='line-clamp-1 cursor-pointer text-lg transition-colors hover:text-primary'
            onClick={() => router.push(`/agents/${agent.id}`)}
          >
            {agent.name}
          </CardTitle>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='h-8 w-8 p-0'>
                  <MoreVertical className='h-4 w-4' />
                  <span className='sr-only'>Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => router.push(`/agents/${agent.id}`)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmailHistory}>View Email History</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className='text-destructive'
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the welcome agent &quot;
                  {agent?.name}&quot;. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant='destructive' onClick={handleDeleteConfirm} disabled={isDeleting}>
                  {isDeleting && <LoadingSpinner className='text-white' />}
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className='space-y-2'>
          <div className='flex items-center'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 gap-2 rounded-full text-xs font-normal hover:bg-muted'
                    onClick={handleEmailClick}
                  >
                    <GoogleIcon className='h-4 w-4' />
                    {agent.configuration?.emailAccount || "No email attached"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to configure email settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className='group relative'>
            <p className='line-clamp-2 text-sm text-muted-foreground'>
              {agent.emailPurpose?.directive || "No directive set"}
            </p>
            {agent.emailPurpose?.directive && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='absolute -right-2 -top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100'
                    >
                      <Info className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className='max-w-xs'>{agent.emailPurpose.directive}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className='border-t pt-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div
              className={`h-2 w-2 rounded-full ${
                agent.status === "published" ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span className='text-sm capitalize'>
              {agent.status === "published" ? "active" : "draft"}
            </span>
          </div>
          {agent.status === "published" && agent.emailsSentToday !== undefined && (
            <div className='text-sm text-muted-foreground'>
              {agent.emailsSentToday} emails sent today
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' width='1em' height='1em' {...props}>
      <path
        fill='#FFC107'
        d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'
      />
      <path
        fill='#FF3D00'
        d='M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'
      />
      <path
        fill='#4CAF50'
        d='M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z'
      />
      <path
        fill='#1976D2'
        d='M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z'
      />
    </svg>
  );
}
