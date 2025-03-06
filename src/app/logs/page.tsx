'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/common/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/common/select"
import { logsUtils, LogRecord } from '@/app/lib/firebase/logsUtils'
import { Button } from "@/app/components/common/button"
import { useToast } from "@/app/components/common/use-toast"
import { db } from '@/app/lib/firebase/firebase'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/common/alert-dialog"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from '@/app/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/app/components/common/loading-spinner'

type LogType = 'api' | 'crawl' | 'email' | 'all'

// Use the LogRecord type from logsUtils
type Log = LogRecord

export default function LogsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [logType, setLogType] = useState<LogType>('all')
  const [logs, setLogs] = useState<Log[]>([])
  const { toast } = useToast()
  const [isResponseOpen, setIsResponseOpen] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<{
    totalPages: number
    totalLogs: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }>({
    totalPages: 1,
    totalLogs: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })

  // Function to load logs
  const loadLogs = async () => {
    try {
      setLoading(true)
      const result = await logsUtils.getRecentLogs(currentPage, 10, logType)
      setLogs(result.logs)
      setPagination(result.pagination)
    } catch (error) {
      console.error('Error loading logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load logs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, logType])

  // Pagination handlers
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

  // Handler for log type change
  const handleLogTypeChange = (value: LogType) => {
    setLogType(value)
    setCurrentPage(1) // Reset to first page when changing filter
  }

  // Handler for viewing response
  const handleViewResponse = (log: Log) => {
    setSelectedLog(log)
    // Only set the response if it exists
    if (log.response) {
      setSelectedResponse(log.response)
    } else {
      setSelectedResponse('No response data available')
    }
    setIsResponseOpen(true)
  }
  
  // Check access after all hooks are defined
  if (!user || user.email !== 'curranvw@gmail.com') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
            <p className="text-gray-500">
              View all system activity and responses
            </p>
          </div>
          <Select value={logType} onValueChange={handleLogTypeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Logs</SelectItem>
              <SelectItem value="api">API Calls</SelectItem>
              <SelectItem value="crawl">Website Crawls</SelectItem>
              <SelectItem value="email">Email Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.timestamp.toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize">{log.type}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          log.status === 'success' ? 'bg-green-50 text-green-700' : 
                          log.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{log.details}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {log.response && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewResponse(log)}
                          >
                            View Response
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination controls */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
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
                  {pagination.totalLogs === 0 ? 0 : ((currentPage - 1) * 10) + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * 10, pagination.totalLogs)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalLogs}</span>{' '}
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
      <AlertDialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader className="flex flex-row items-start justify-between">
            <div>
              <AlertDialogTitle>Response Details</AlertDialogTitle>
              {selectedLog && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="text-sm text-gray-500">
                    {selectedLog.timestamp.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{selectedLog.type}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      selectedLog.status === 'success' ? 'bg-green-50 text-green-700' : 
                      selectedLog.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {selectedLog.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsResponseOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDialogHeader>
          
          {selectedLog && (
            <>
              <div className="border-t border-gray-100 my-4" />
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Details</h3>
                  <p className="text-sm text-gray-600">{selectedLog.details}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Response</h3>
                  <div className="max-h-[300px] overflow-y-auto">
                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedResponse}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 