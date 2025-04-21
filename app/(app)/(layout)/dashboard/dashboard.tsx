"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Mail,
  Bot,
  Inbox,
  Activity,
  AlertCircle,
  Plus,
  CheckCircle,
} from "lucide-react";

import { useWorkspace } from "@/hooks/use-workspace";
import * as emailHistoryUtils from "@/firebase/email-history-utils";
import * as welcomeAgentUtils from "@/firebase/welcome-agent-utils";
import { useAuth } from "@/hooks/use-auth";
import type { WelcomeAgent } from "@/types/welcome-agent";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import UpgradePlanModal from "@/components/updgrade-plan-modal";

interface DashboardStats {
  totalEmails: number;
  emailsPending: number;
  totalAgents: number;
  recentActivity: emailHistoryUtils.EmailRecord[];
}

function RobotAnimation() {
  return (
    <div className='robot-animation'>
      <svg viewBox='0 0 200 200' className='h-full w-full'>
        {/* Robot head */}
        <rect
          className='robot-head'
          x='60'
          y='60'
          width='80'
          height='80'
          rx='10'
          fill='currentColor'
        />
        {/* Robot eyes container */}
        <g className='robot-eyes'>
          <circle cx='85' cy='90' r='8' fill='currentColor' /> {/* Eye sockets */}
          <circle cx='115' cy='90' r='8' fill='currentColor' />
          <circle className='robot-eye' cx='85' cy='90' r='6' fill='#3b82f6' /> {/* Actual eyes */}
          <circle className='robot-eye' cx='115' cy='90' r='6' fill='#3b82f6' />
        </g>
        {/* Robot antenna */}
        <line
          className='robot-antenna'
          x1='100'
          y1='60'
          x2='100'
          y2='40'
          stroke='#94a3b8'
          strokeWidth='4'
        />
        <circle className='robot-antenna-tip' cx='100' cy='35' r='6' fill='#3b82f6' />
      </svg>
      <style jsx>{`
        .robot-animation {
          animation: float 3s ease-in-out infinite;
          color: var(--muted);
        }
        .robot-eye {
          transform-origin: center;
          animation: blink 4s infinite;
        }
        .robot-antenna-tip {
          animation: pulse 2s infinite;
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes blink {
          0%,
          96%,
          98% {
            transform: scaleY(1);
          }
          97% {
            transform: scaleY(0.1);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            fill: #3b82f6;
          }
          50% {
            fill: #60a5fa;
          }
        }
      `}</style>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard", workspace?.id],
    queryFn: async () => {
      if (!workspace || !user) return null;
      setLoading(true);

      // Get all emails to get accurate counts
      const { emails } = await emailHistoryUtils.getEmailHistory({
        workspaceId: workspace.id,
      });

      const { agents } = await welcomeAgentUtils.getWelcomeAgents({
        workspaceId: workspace.id,
      });

      // Calculate email stats
      const allEmails = emails || [];
      const totalSentEmails = allEmails?.filter((e) => e.status === "sent").length || 0;
      const emailsPending = allEmails?.filter((e) => e.status === "under_review").length || 0;

      // Get recent activity (last 5 items)
      const recentEmails = allEmails
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Filter agents to get only published ones
      const activeAgents =
        agents?.filter((agent: WelcomeAgent) => {
          return agent.status === "published";
        }) || [];

      return {
        totalEmails: totalSentEmails,
        emailsPending,
        totalAgents: activeAgents.length,
        recentActivity: recentEmails,
      };
    },
    enabled: !!workspace && !!user,
  });

  useEffect(() => {
    if (dashboardData) {
      setStats(dashboardData);
      setLoading(false);
    }
  }, [dashboardData]);

  const [upgradePlanModalOpen, setUpgradePlanModalOpen] = useState(false);
  const handleAddAgent = () => {
    if (user && user.limits.agents > user.usage.agents) {
      router.push("/agents/new");
    } else {
      setUpgradePlanModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className='mx-auto max-w-7xl space-y-8 px-4 py-8'>
        <div className='space-y-2'>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-5 w-96' />
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className='overflow-hidden'>
                <CardHeader className='pb-2'>
                  <Skeleton className='h-5 w-32' />
                </CardHeader>
                <CardContent>
                  <Skeleton className='mb-2 h-8 w-16' />
                  <Skeleton className='h-4 w-40' />
                </CardContent>
              </Card>
            ))}
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {Array(2)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className='overflow-hidden'>
                <CardHeader>
                  <Skeleton className='mb-2 h-6 w-40' />
                  <Skeleton className='h-4 w-64' />
                </CardHeader>
                <CardContent>
                  <Skeleton className='h-10 w-full' />
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    );
  }

  // Show empty state if no agents exist
  if (!stats?.totalAgents) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='mb-8 space-y-2'>
          <h1 className='flex items-center gap-2 text-3xl font-bold'>
            Welcome to Welcome Agent <span className='text-2xl'>👋</span>
          </h1>
          <p className='text-base text-muted-foreground'>
            Automate your welcome emails with AI-powered personalization
          </p>
        </div>

        {/* Empty State */}
        <div className='relative'>
          {/* Main Empty State */}
          <div className='flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/5 p-8 transition-all hover:bg-muted/10'>
            <div className='mb-8 h-24 w-24 text-muted'>
              <RobotAnimation />
            </div>
            <h2 className='mb-3 text-center text-2xl font-semibold'>
              Create Your First Welcome Agent
            </h2>
            <p className='mb-8 max-w-md text-center text-muted-foreground'>
              Get started by creating a welcome agent that will automatically send personalized
              emails to your new signups.
            </p>
            <Button size='lg' className='gap-2 font-medium' onClick={() => handleAddAgent()}>
              <Plus className='h-4 w-4' />
              Create Your First Welcome Agent
            </Button>

            <UpgradePlanModal
              title='Upgrade to add more agents'
              description='You have reached the maximum number of agents for your plan. Please upgrade to add more agents.'
              isOpen={upgradePlanModalOpen}
              setIsOpen={setUpgradePlanModalOpen}
            />

            {user && (
              <div className='mt-4 text-center text-sm text-muted-foreground'>
                <p>
                  You can create up to {user.limits.agents - user.usage.agents} more agents on your
                  current plan
                </p>
              </div>
            )}
          </div>

          {/* Background Empty States */}
          <div className='mt-16 grid grid-cols-1 gap-4 opacity-50 md:grid-cols-3'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Total Emails Sent</CardTitle>
                <Mail className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>0</div>
                <p className='mt-1 text-xs text-muted-foreground'>Across all welcome agents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Total Agents</CardTitle>
                <Bot className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>0</div>
                <p className='mt-1 text-xs text-muted-foreground'>Welcome agents in workspace</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Pending Review</CardTitle>
                <Inbox className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>0</div>
                <p className='mt-1 text-xs text-muted-foreground'>Emails waiting for approval</p>
              </CardContent>
            </Card>
          </div>

          {/* Background Activity Empty State */}
          <Card className='mt-6 opacity-50'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <Activity className='h-5 w-5' />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='py-8 text-center'>
                <p className='text-sm text-muted-foreground'>
                  Activity will appear here once you create your first welcome agent
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Return normal dashboard if agents exist
  return (
    <div className='mx-auto max-w-7xl space-y-8 px-4 py-8'>
      {/* Welcome Section */}
      <div className='space-y-2'>
        <h1 className='flex items-center gap-2 text-3xl font-bold'>
          Welcome to Welcome Agent <span className='text-2xl'>👋</span>
        </h1>
        <p className='text-base text-muted-foreground'>
          Automate your welcome emails with AI-powered personalization
        </p>
      </div>

      {/* Quick Stats */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <Card className='transition-all hover:shadow-md'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Emails Sent</CardTitle>
            <Mail className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats?.totalEmails || 0}</div>
            <p className='mt-1 text-xs text-muted-foreground'>Across all welcome agents</p>
          </CardContent>
        </Card>

        <Card className='transition-all hover:shadow-md'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Agents</CardTitle>
            <Bot className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats?.totalAgents || 0}</div>
            <p className='mt-1 text-xs text-muted-foreground'>Welcome agents in workspace</p>
          </CardContent>
        </Card>

        <Card
          className={`transition-all hover:shadow-md ${
            stats?.emailsPending ? "border-amber-200 bg-amber-50/30 dark:bg-amber-900/10" : ""
          }`}
        >
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Pending Review</CardTitle>
            <Inbox
              className={`h-4 w-4 ${
                stats?.emailsPending ? "text-amber-500" : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats?.emailsPending || 0}</div>
            <p className='mt-1 text-xs text-muted-foreground'>Emails waiting for approval</p>
          </CardContent>
          {stats?.emailsPending > 0 && (
            <CardFooter className='pt-0'>
              <Link href='/email-history'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/20'
                >
                  Review now
                  <ArrowRight className='ml-1 h-3 w-3' />
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <Card className='transition-all hover:shadow-md'>
          <CardHeader>
            <CardTitle>Create Welcome Agent</CardTitle>
            <CardDescription>
              Set up a new AI-powered welcome email agent for your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href='/agents/new' className='block'>
              <Button className='w-full gap-2 font-medium'>
                <Plus className='h-4 w-4' />
                Create New Agent
              </Button>
            </Link>
          </CardContent>
          {user && (
            <CardFooter className='text-xs text-muted-foreground'>
              You can create up to {user.limits.agents - user.usage.agents} more agents on your
              current plan
            </CardFooter>
          )}
        </Card>

        <Card className='transition-all hover:shadow-md'>
          <CardHeader>
            <CardTitle>Review Pending Emails</CardTitle>
            <CardDescription>Review and approve AI-generated welcome emails</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href='/email-history' className='block'>
              <Button variant='outline' className='w-full'>
                Go to Email History
                <ArrowRight className='ml-2 h-4 w-4' />
              </Button>
            </Link>
          </CardContent>
          {stats?.emailsPending > 0 && (
            <CardFooter>
              <Badge
                variant='outline'
                className={`bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400`}
              >
                {stats.emailsPending} email{stats.emailsPending > 1 ? "s" : ""} pending review
              </Badge>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className='transition-all hover:shadow-md'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Activity className='h-5 w-5' />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className='space-y-4'>
              {stats.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/20'
                >
                  <div className='flex items-center gap-3'>
                    {activity.status === "sent" ? (
                      <>
                        <div className='rounded-full bg-green-100 p-1.5 text-green-600 dark:bg-green-900/30 dark:text-green-400'>
                          <CheckCircle className='h-4 w-4' />
                        </div>
                        <span>
                          Email sent to
                          {activity.recipientEmail}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className='rounded-full bg-red-100 p-1.5 text-red-600 dark:bg-red-900/30 dark:text-red-400'>
                          <AlertCircle className='h-4 w-4' />
                        </div>
                        <span>Email is under review for {activity.recipientEmail}</span>
                      </>
                    )}
                  </div>
                  <span className='text-xs text-muted-foreground'>{activity.updatedAt}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center py-8'>
              <Activity className='mb-2 h-8 w-8 text-muted-foreground opacity-40' />
              <p className='text-sm text-muted-foreground'>No recent activity</p>
            </div>
          )}
        </CardContent>
        {stats?.recentActivity && stats.recentActivity.length > 0 && (
          <CardFooter>
            <Link href='/email-history' className='w-full'>
              <Button variant='ghost' className='w-full text-sm'>
                View All Activity
                <ArrowRight className='ml-2 h-4 w-4' />
              </Button>
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
