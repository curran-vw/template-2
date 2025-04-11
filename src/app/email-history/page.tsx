'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWorkspace } from '@/app/lib/hooks/useWorkspace'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/app/components/common/button'
import { Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { Badge } from '@/app/components/common/badge'
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/common/tabs"
import { User, Building } from 'lucide-react'

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
  // New fields for AI responses
  userInfo?: string
  businessInfo?: string
}

const formatMarkdownContent = (content: string | undefined) => {
  if (!content) return []
  
  return content
    .split('\n\n')
    .filter(section => section.trim())
    .map(section => {
      // Keep bold markers for now - we'll handle them in the render
      return section
        .replace(/\[[\d\]]/g, '') // Remove reference numbers [1], [2], etc.
        .trim()
    })
}

export default function EmailHistory() {
  const { workspace } = useWorkspace()
  const { toast } = useToast()
  const [emails, setEmails] = useState<EmailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const agentId = searchParams?.get('agentId') ?? null
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<{
    totalPages: number
    totalEmails: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }>({
    totalPages: 1,
    totalEmails: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })

  const loadEmails = useCallback(async () => {
    try {
      const result = await emailHistoryUtils.getEmailHistory(
        workspace?.id!,
        agentId,
        currentPage,
        10
      )
      setEmails(result.emails)
      setPagination(result.pagination)
      console.log('Loaded emails:', result.emails)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load email history',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [workspace?.id, agentId, currentPage, toast])

  useEffect(() => {
    if (workspace?.id) {
      loadEmails()
    }
  }, [workspace?.id, loadEmails, currentPage])

  const handleApprove = async (emailId: string) => {
    try {
      await emailHistoryUtils.updateEmailStatus(emailId, 'sent')
      toast({
        title: 'Success',
        description: 'Email approved and sent successfully',
      })
      loadEmails() // Refresh the list
    } catch (error) {
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
        description: 'Email denied successfully',
      })
      loadEmails() // Refresh the list
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deny email',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: EmailRecord['status']) => {
    const variants = {
      sent: 'success',
      under_review: 'warning',
      denied: 'destructive',
      failed: 'destructive',
    } as const

    const labels = {
      sent: 'Sent',
      under_review: 'Pending',
      denied: 'Denied',
      failed: 'Failed',
    }

    return (
      <Badge variant={variants[status]}>{labels[status]}</Badge>
    )
  }

  const formatContent = (content: any): string => {
    if (typeof content === 'string') return content
    if (typeof content === 'object') {
      try {
        return JSON.stringify(content, null, 2)
      } catch {
        return String(content)
      }
    }
    return String(content)
  }

  // Add pagination handlers
  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const handlePreviousPage = () => {
    if (pagination.hasPreviousPage) {
      setCurrentPage(prev => prev - 1)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Email History</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((email) => (
              <React.Fragment key={email.id}>
                <TableRow>
                  <TableCell>{email.recipientEmail}</TableCell>
                  <TableCell>{email.agentName}</TableCell>
                  <TableCell>{getStatusBadge(email.status)}</TableCell>
                  <TableCell>
                    {email.createdAt.toLocaleDateString()} {email.createdAt.toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
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
                      <Button
                        onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                        variant="ghost"
                        size="sm"
                        className="hover:bg-blue-50 hover:text-blue-600"
                      >
                        {expandedEmail === email.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="ml-2">Preview</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedEmail === email.id && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-gray-50">
                      <div className="p-6">
                        <div className="grid grid-cols-5 gap-6">
                          {/* Email Preview - Left Side (3 columns) */}
                          <div className="col-span-3">
                            <div className="bg-white rounded-lg border shadow-sm">
                              <div className="p-4 border-b">
                                <h3 className="font-medium">Email Preview</h3>
                              </div>
                              <div className="p-4 space-y-3">
                                <div>
                                  <span className="text-sm text-gray-500">To:</span>
                                  <span className="text-sm ml-2">{email.recipientEmail}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-gray-500">Subject:</span>
                                  <span className="text-sm font-medium ml-2">{formatContent(email.subject)}</span>
                                </div>
                                <div className="pt-3 border-t">
                                  <div 
                                    className="text-sm text-gray-600 leading-relaxed" 
                                    dangerouslySetInnerHTML={{ 
                                      __html: formatContent(email.body)
                                        .replace(/<[^>]*>/g, '')
                                        .split('\n')
                                        .filter(line => line.trim())
                                        .map(line => {
                                          if (line.match(/^(Hey|Hi|Dear|Hello|Best|Regards|Sincerely|Thanks|Thank you)/)) {
                                            return `<div class="mb-4">${line}</div>`
                                          }
                                          return `<div class="mb-4">${line}</div>`
                                        })
                                        .join('')
                                    }} 
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Details Tabs - Right Side (2 columns) */}
                          <div className="col-span-2">
                            <div className="bg-white rounded-lg border shadow-sm">
                              <div className="p-4 border-b">
                                <h3 className="font-medium">Welcome Agent Research</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                  This is the research the welcome agent AI did on your lead to generate the email.
                                </p>
                              </div>
                              
                              <Tabs defaultValue="personal" className="bg-white">
                                <div className="p-4">
                                  <TabsList className="grid grid-cols-2">
                                    <TabsTrigger value="personal" className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      Personal Details
                                    </TabsTrigger>
                                    <TabsTrigger value="business" className="flex items-center gap-2">
                                      <Building className="h-4 w-4" />
                                      Business Details
                                    </TabsTrigger>
                                  </TabsList>
                                </div>

                                <div className="px-4 pb-4">
                                  <TabsContent value="personal" className="mt-0">
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                      {email.userInfo ? (
                                        formatMarkdownContent(email.userInfo).map((section, index) => (
                                          <div key={index} className="text-sm">
                                            {section.split('\n').map((line, lineIndex) => {
                                              // Handle bold text
                                              const boldText = line.match(/\*\*(.*?)\*\*/g)
                                              if (boldText) {
                                                const parts = line.split(/(\*\*.*?\*\*)/)
                                                return (
                                                  <div key={lineIndex} className="mb-2">
                                                    {parts.map((part, partIndex) => {
                                                      if (part.startsWith('**') && part.endsWith('**')) {
                                                        // It's bold text
                                                        return <span key={partIndex} className="font-semibold">{part.replace(/\*\*/g, '')}</span>
                                                      }
                                                      return <span key={partIndex}>{part}</span>
                                                    })}
                                                  </div>
                                                )
                                              }

                                              // Handle lists
                                              if (line.startsWith('- ')) {
                                                return (
                                                  <div key={lineIndex} className="ml-4 mb-1 flex">
                                                    <span className="mr-2">•</span>
                                                    <span>{line.substring(2)}</span>
                                                  </div>
                                                )
                                              }

                                              // Handle headers (lines ending with :)
                                              if (line.endsWith(':')) {
                                                return (
                                                  <h4 key={lineIndex} className="font-medium text-gray-900 mt-4 mb-2">
                                                    {line}
                                                  </h4>
                                                )
                                              }

                                              // Regular text
                                              return (
                                                <div key={lineIndex} className="mb-2 text-gray-600">
                                                  {line}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-gray-500">No personal details available</p>
                                      )}
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="business" className="mt-0">
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                      {email.businessInfo ? (
                                        formatMarkdownContent(email.businessInfo).map((section, index) => (
                                          <div key={index} className="text-sm">
                                            {section.split('\n').map((line, lineIndex) => {
                                              // Handle bold text
                                              const boldText = line.match(/\*\*.*?\*\*/g)
                                              if (boldText) {
                                                const parts = line.split(/(\*\*.*?\*\*)/)
                                                return (
                                                  <div key={lineIndex} className="mb-2">
                                                    {parts.map((part, partIndex) => {
                                                      if (part.startsWith('**') && part.endsWith('**')) {
                                                        return <span key={partIndex} className="font-semibold">{part.replace(/\*\*/g, '')}</span>
                                                      }
                                                      return <span key={partIndex}>{part}</span>
                                                    })}
                                                  </div>
                                                )
                                              }

                                              // Handle lists
                                              if (line.startsWith('- ')) {
                                                return (
                                                  <div key={lineIndex} className="ml-4 mb-1 flex">
                                                    <span className="mr-2">•</span>
                                                    <span>{line.substring(2)}</span>
                                                  </div>
                                                )
                                              }

                                              // Handle headers
                                              if (line.endsWith(':')) {
                                                return (
                                                  <h4 key={lineIndex} className="font-medium text-gray-900 mt-4 mb-2">
                                                    {line}
                                                  </h4>
                                                )
                                              }

                                              // Regular text
                                              return (
                                                <div key={lineIndex} className="mb-2 text-gray-600">
                                                  {line}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-gray-500">No business details available</p>
                                      )}
                                    </div>
                                  </TabsContent>
                                </div>
                              </Tabs>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add pagination controls */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <Button
            onClick={handlePreviousPage}
            disabled={!pagination.hasPreviousPage}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={!pagination.hasNextPage}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {((currentPage - 1) * 10) + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(currentPage * 10, pagination.totalEmails)}
              </span>{' '}
              of{' '}
              <span className="font-medium">{pagination.totalEmails}</span>{' '}
              results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <Button
                onClick={handlePreviousPage}
                disabled={!pagination.hasPreviousPage}
                variant="outline"
                size="sm"
                className="rounded-l-md"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Previous</span>
              </Button>
              <div className="px-4 py-2 text-sm font-semibold">
                Page {currentPage} of {pagination.totalPages}
              </div>
              <Button
                onClick={handleNextPage}
                disabled={!pagination.hasNextPage}
                variant="outline"
                size="sm"
                className="rounded-r-md"
              >
                <span className="mr-2">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
} 