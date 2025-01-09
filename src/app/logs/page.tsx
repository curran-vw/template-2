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
import { logsUtils } from '@/app/lib/firebase/logsUtils'
import { Button } from "@/app/components/common/button"
import { useToast } from "@/app/components/common/use-toast"
import { onSnapshot, query, collection, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'

type LogType = 'api' | 'crawl' | 'email' | 'all'

interface Log {
  id: string
  timestamp: Date
  type: 'api' | 'crawl' | 'email'
  status: 'success' | 'failed' | 'pending'
  details: string
  response?: string
}

export default function LogsPage() {
  const [logType, setLogType] = useState<LogType>('all')
  const [logs, setLogs] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const q = query(
      collection(db, 'logs'),
      orderBy('timestamp', 'desc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setLogs(newLogs)
    })

    return () => unsubscribe()
  }, [])

  const filteredLogs = logs.filter(log => {
    if (logType === 'all') return true
    return log.type === logType
  })

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
          <Select value={logType} onValueChange={(value: LogType) => setLogType(value)}>
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
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {logs.length === 0 ? 'No logs found' : 'No logs match the selected filter'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
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
                          onClick={() => {
                            toast({
                              title: "Response Details",
                              description: log.response,
                            })
                          }}
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
      </div>
    </div>
  )
} 