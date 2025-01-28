'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/app/lib/hooks/useWorkspace'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/app/components/common/button'
import { Check, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/common/table'
import { useToast } from '@/app/components/common/use-toast'
import { emailHistoryUtils } from '@/app/lib/firebase/emailHistoryUtils'
import { LoadingSpinner } from '@/app/components/common/loading-spinner'
import { EmailPreviewModal } from '@/app/components/common/email-preview-modal'
import { welcomeAgentUtils } from '@/app/lib/firebase/welcomeAgentUtils'

interface EmailRecord {
  id: string
  recipientEmail: string
  status: 'sent' | 'under_review' | 'denied' | 'failed'
  createdAt: Date
  agentId: string
  agentName: string
  subject: string
  body: string
  workspaceId: string
  error?: string
  gmailConnectionId?: string
}

export default function EmailHistory() {
  const { workspace } = useWorkspace()
  const { toast } = useToast()
  const [emails, setEmails] = useState<EmailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Get agentId from URL query params
  const agentId = searchParams.get('agentId')
  const [selectedAgent, setSelectedAgent] = useState<{id: string, name: string} | null>(null)

  // Load emails whenever workspace or agentId changes
  useEffect(() => {
    if (workspace?.id) {
      loadEmails()
      if (agentId) {
        loadAgentDetails(agentId)
      } else {
        setSelectedAgent(null)
      }
    }
  }, [workspace?.id, agentId])

  const loadAgentDetails = async (id: string) => {
    try {
      console.log('Loading agent details for:', id) // Debug log
      const agent = await welcomeAgentUtils.getWelcomeAgent(id)
      if (agent) {
        console.log('Found agent:', agent) // Debug log
        setSelectedAgent({
          id: agent.id!,
          name: agent.name
        })
      }
    } catch (error) {
      console.error('Error loading agent details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load agent details',
        variant: 'destructive',
      })
    }
  }

  const loadEmails = async () => {
    try {
      console.log('Loading emails with filter:', { workspaceId: workspace?.id, agentId }) // Debug log
      const fetchedEmails = await emailHistoryUtils.getEmailHistory(
        workspace?.id!,
        agentId
      )
      console.log('Fetched emails:', fetchedEmails) // Debug log
      setEmails(fetchedEmails)
    } catch (error) {
      console.error('Error loading emails:', error)
      toast({
        title: 'Error',
        description: 'Failed to load email history',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (emailId: string) => {
    try {
      await emailHistoryUtils.updateEmailStatus(emailId, 'sent')
      toast({
        title: 'Success',
        description: 'Email approved and sent',
      })
      loadEmails() // Refresh the list
    } catch (error) {
      console.error('Error approving email:', error)
      toast({
        title: 'Error',
        description: 'Failed to approve email',
        variant: 'destructive',
      })
    }
  }

  const handleDeny = async (emailId: string) => {
    try {
      await emailHistoryUtils.updateEmailStatus(emailId, 'denied')
      toast({
        title: 'Success',
        description: 'Email marked as denied',
      })
      loadEmails() // Refresh the list
    } catch (error) {
      console.error('Error denying email:', error)
      toast({
        title: 'Error',
        description: 'Failed to deny email',
        variant: 'destructive',
      })
    }
  }

  const clearFilter = () => {
    router.push('/email-history')
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Email History</h1>
          {selectedAgent && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
              <span>Filtered by: {selectedAgent.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-gray-200"
                onClick={clearFilter}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((email) => (
              <TableRow key={email.id}>
                <TableCell>{email.recipientEmail}</TableCell>
                <TableCell>{email.agentName}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      email.status === 'sent'
                        ? 'bg-green-100 text-green-800'
                        : email.status === 'under_review'
                        ? 'bg-yellow-100 text-yellow-800'
                        : email.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {email.status.replace('_', ' ')}
                  </span>
                  {email.error && (
                    <span className="block mt-1 text-xs text-red-600">
                      Error: {email.error}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="whitespace-nowrap">
                    {email.createdAt.toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {email.createdAt.toLocaleTimeString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <EmailPreviewModal email={email} />
                    {email.status === 'under_review' && (
                      <>
                        <Button
                          onClick={() => handleApprove(email.id)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-green-50 hover:text-green-600"
                        >
                          <Check className="h-4 w-4" />
                          <span className="ml-2">Approve</span>
                        </Button>
                        <Button
                          onClick={() => handleDeny(email.id)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                          <span className="ml-2">Deny</span>
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 