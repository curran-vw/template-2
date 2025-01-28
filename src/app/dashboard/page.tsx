'use client'

import { useWorkspace } from '@/app/lib/hooks/useWorkspace'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/common/card'
import { Button } from '@/app/components/common/button'
import { LoadingSpinner } from '@/app/components/common/loading-spinner'
import { useEffect, useState } from 'react'
import { emailHistoryUtils } from '@/app/lib/firebase/emailHistoryUtils'
import { welcomeAgentUtils } from '@/app/lib/firebase/welcomeAgentUtils'
import Link from 'next/link'
import { ArrowRight, Mail, Users, Bot, Inbox, Activity, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface DashboardStats {
  totalEmails: number
  emailsPending: number
  totalAgents: number
  recentActivity: {
    type: 'email_sent' | 'email_pending' | 'agent_created'
    message: string
    timestamp: Date
  }[]
}

// Add RobotAnimation component from welcome-agent/page.tsx
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

export default function Dashboard() {
  const { workspace } = useWorkspace()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!workspace?.id) return
      
      try {
        // Get all emails to get accurate counts
        const emailResult = await emailHistoryUtils.getEmailHistory(workspace.id, null, 1, 1000)
        
        let agents: WelcomeAgent[] = []
        try {
          agents = await welcomeAgentUtils.getWelcomeAgents(workspace.id)
        } catch (agentError) {
          console.error('Error loading agents:', agentError)
        }

        // Calculate email stats
        const allEmails = emailResult.emails
        const totalSentEmails = allEmails.filter(e => e.status === 'sent').length
        const emailsPending = allEmails.filter(e => e.status === 'under_review').length

        // Get recent activity (last 5 items instead of 10)
        const recentEmails = allEmails
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
          .map(email => {
            let message = ''
            let type: 'email_sent' | 'email_pending' | 'agent_created' = 'email_pending'

            switch (email.status) {
              case 'sent':
                type = 'email_sent'
                message = `Email sent to ${email.recipientEmail}`
                break
              case 'under_review':
                type = 'email_pending'
                message = `Email pending review for ${email.recipientEmail}`
                break
              case 'denied':
                type = 'email_pending'
                message = `Email denied for ${email.recipientEmail}`
                break
              default:
                message = `Email ${email.status} for ${email.recipientEmail}`
            }

            return {
              type,
              message,
              timestamp: email.createdAt
            }
          })

        // Add agent creation events if available
        const activeAgents = agents.filter(agent => !agent.isArchived)

        setStats({
          totalEmails: totalSentEmails,
          emailsPending,
          totalAgents: activeAgents.length,
          recentActivity: recentEmails
        })

        console.log('Dashboard Stats:', {
          totalEmails: totalSentEmails,
          emailsPending,
          totalAgents: activeAgents.length,
          recentEmails
        })
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [workspace?.id])

  if (loading) return <LoadingSpinner />

  // Show empty state if no agents exist
  if (!stats?.totalAgents) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Welcome to Welcome Agent <span className="text-2xl">👋</span>
          </h1>
          <p className="text-base text-gray-600">
            Automate your welcome emails with AI-powered personalization
          </p>
        </div>

        {/* Empty State */}
        <div className="relative">
          {/* Main Empty State - Add dashed border around entire section */}
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="w-24 h-24 mb-8">
              <RobotAnimation />
            </div>
            <h2 className="text-2xl font-semibold text-center mb-3">
              Create Your First Welcome Agent
            </h2>
            <p className="text-gray-600 text-center max-w-md mb-8">
              Get started by creating a welcome agent that will automatically send personalized emails to your new signups.
            </p>
            <Link href="/welcome-agent/new">
              <Button className="bg-black hover:bg-gray-800 text-white gap-2">
                <span>+</span>
                Create Your First Welcome Agent
              </Button>
            </Link>
          </div>

          {/* Background Empty States - Add more spacing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 opacity-50">
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Emails Sent</CardTitle>
                <Mail className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-gray-500 mt-1">Across all welcome agents</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Agents</CardTitle>
                <Bot className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-gray-500 mt-1">Welcome agents in workspace</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
                <Inbox className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-gray-500 mt-1">Emails waiting for approval</p>
              </CardContent>
            </Card>
          </div>

          {/* Background Activity Empty State */}
          <Card className="bg-white mt-6 opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  Activity will appear here once you create your first welcome agent
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Return normal dashboard if agents exist
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          Welcome to Welcome Agent <span className="text-2xl">👋</span>
        </h1>
        <p className="text-base text-gray-600">
          Automate your welcome emails with AI-powered personalization
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmails || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Across all welcome agents</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAgents || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Welcome agents in workspace</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
            <Inbox className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.emailsPending || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Emails waiting for approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Create Welcome Agent</CardTitle>
            <p className="text-sm text-gray-500">
              Set up a new AI-powered welcome email agent for your business
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/welcome-agent/new" className="block">
              <Button className="w-full bg-black hover:bg-gray-800 text-white">
                <span className="mr-2">+</span>
                Create New Agent
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Review Pending Emails</CardTitle>
            <p className="text-sm text-gray-500">
              Review and approve AI-generated welcome emails
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/email-history" className="block">
              <Button variant="outline" className="w-full text-gray-700 hover:bg-gray-50">
                Go to Email History
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {activity.type === 'email_sent' ? (
                      <div className="text-green-500 rounded-full p-1 bg-green-50">
                        <Mail className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="text-red-500 rounded-full p-1 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                    )}
                    <span className="text-sm text-gray-600">{activity.message}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {activity.timestamp.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 