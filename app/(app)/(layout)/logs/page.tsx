"use client";

import { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import * as logsUtils from "@/firebase/logs-utils";
import type { LogRecord } from "@/firebase/logs-utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
type LogType = "api" | "crawl" | "email" | "all";

// Use the LogRecord type from logsUtils
type Log = LogRecord;

export default function LogsPage() {
  const { user, loading: userLoading } = useAuth();
  const [logType, setLogType] = useState<LogType>("all");
  const [logs, setLogs] = useState<Log[]>([]);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<{
    totalPages: number;
    totalLogs: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>({
    totalPages: 1,
    totalLogs: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Use React Query for logs data fetching
  const {
    data: logsData,
    isLoading,
    isRefetching,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["logs", logType, currentPage],
    queryFn: async () => {
      return await logsUtils.getLogs({
        page: currentPage,
        pageSize: 10,
        logType,
      });
    },
  });

  useEffect(() => {
    if (logsData) {
      setLogs(logsData.logs || []);
      setPagination(
        logsData.pagination || {
          totalPages: 1,
          totalLogs: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      );
      setLoading(false);
    }
  }, [logsData]);

  // Pagination handlers
  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Handler for log type change
  const handleLogTypeChange = (value: LogType) => {
    setLogType(value);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  // Handler for viewing response
  const handleViewResponse = (log: Log) => {
    setSelectedLog(log);
    // Only set the response if it exists
    if (log.response) {
      setSelectedResponse(log.response);
    } else {
      setSelectedResponse("No response data available");
    }
    setIsResponseOpen(true);
  };

  // Check access after all hooks are defined
  if (
    !user ||
    (user.email !== "curranvw@gmail.com" && user.email !== "abdelr7manabdelmoaty@gmail.com")
  ) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center p-4'>
        <AlertCircle className='h-12 w-12 text-destructive mb-4' />
        <h1 className='text-2xl font-bold text-destructive'>Access Denied</h1>
        <p className='mt-2'>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className='container py-6'>
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle className='text-2xl'>System Logs</CardTitle>
              <p className='text-sm text-muted-foreground'>
                View all system activity and responses
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Select value={logType} onValueChange={handleLogTypeChange}>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='Filter by type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Logs</SelectItem>
                  <SelectItem value='api'>API Calls</SelectItem>
                  <SelectItem value='crawl'>Website Crawls</SelectItem>
                  <SelectItem value='email'>Email Activity</SelectItem>
                </SelectContent>
              </Select>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='icon'
                      onClick={() => refetchLogs()}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                      <span className='sr-only'>Refresh logs</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh logs</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='space-y-4'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='w-1/3'>Details</TableHead>
                    <TableHead>Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className='py-8 text-center text-muted-foreground'>
                        No logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className='whitespace-nowrap'>
                          {log.timestamp.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline' className='uppercase'>
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center'>
                            {log.status === "success" ? (
                              <CheckCircle className='mr-1.5 h-3.5 w-3.5 text-success' />
                            ) : log.status === "pending" ? (
                              <Clock className='mr-1.5 h-3.5 w-3.5 text-warning' />
                            ) : (
                              <AlertCircle className='mr-1.5 h-3.5 w-3.5 text-destructive' />
                            )}
                            <span
                              className={`text-xs font-medium ${
                                log.status === "success"
                                  ? "text-success"
                                  : log.status === "pending"
                                  ? "text-warning"
                                  : "text-destructive"
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className='max-w-md truncate'>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className='cursor-help'>{log.details}</span>
                              </TooltipTrigger>
                              <TooltipContent className='max-w-md'>
                                <p>{log.details}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {log.response ? (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleViewResponse(log)}
                              className='hover:bg-muted'
                            >
                              View Response
                            </Button>
                          ) : (
                            <span className='text-xs text-muted-foreground'>No response</span>
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
          <div className='mt-4 flex items-center justify-between px-2 py-2'>
            <div className='flex flex-1 justify-between sm:hidden'>
              <Button
                onClick={handlePreviousPage}
                disabled={!pagination.hasPreviousPage || loading}
                variant='outline'
                size='sm'
              >
                Previous
              </Button>
              <Button
                onClick={handleNextPage}
                disabled={!pagination.hasNextPage || loading}
                variant='outline'
                size='sm'
              >
                Next
              </Button>
            </div>
            <div className='hidden sm:flex sm:flex-1 sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>
                  Showing{" "}
                  <span className='font-medium'>
                    {pagination.totalLogs === 0 ? 0 : (currentPage - 1) * 10 + 1}
                  </span>{" "}
                  to{" "}
                  <span className='font-medium'>
                    {Math.min(currentPage * 10, pagination.totalLogs)}
                  </span>{" "}
                  of <span className='font-medium'>{pagination.totalLogs}</span> results
                </p>
              </div>
              <div>
                <div className='isolate inline-flex -space-x-px rounded-md' aria-label='Pagination'>
                  <Button
                    onClick={handlePreviousPage}
                    disabled={!pagination.hasPreviousPage || loading}
                    variant='outline'
                    size='sm'
                    className='rounded-l-md'
                  >
                    <ChevronLeft className='h-4 w-4' />
                    <span className='ml-2'>Previous</span>
                  </Button>
                  <div className='flex items-center border-y border-input bg-background px-4 self-stretch text-sm font-semibold'>
                    Page {currentPage} of {pagination.totalPages}
                  </div>
                  <Button
                    onClick={handleNextPage}
                    disabled={!pagination.hasNextPage || loading}
                    variant='outline'
                    size='sm'
                    className='rounded-r-md'
                  >
                    <span className='mr-2'>Next</span>
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <AlertDialogContent className='max-w-2xl'>
          <AlertDialogHeader className='flex flex-row items-start justify-between'>
            <div>
              <AlertDialogTitle>Response Details</AlertDialogTitle>
              {selectedLog && (
                <div className='mt-1 flex flex-col gap-1'>
                  <div className='text-sm text-muted-foreground'>
                    {selectedLog.timestamp.toLocaleString()}
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='capitalize'>
                      {selectedLog.type}
                    </Badge>
                    <div className='flex items-center'>
                      {selectedLog.status === "success" ? (
                        <CheckCircle className='mr-1.5 h-3.5 w-3.5 text-success' />
                      ) : selectedLog.status === "pending" ? (
                        <Clock className='mr-1.5 h-3.5 w-3.5 text-warning' />
                      ) : (
                        <AlertCircle className='mr-1.5 h-3.5 w-3.5 text-destructive' />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          selectedLog.status === "success"
                            ? "text-success"
                            : selectedLog.status === "pending"
                            ? "text-warning"
                            : "text-destructive"
                        }`}
                      >
                        {selectedLog.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0'
              onClick={() => setIsResponseOpen(false)}
            >
              <X className='h-4 w-4' />
              <span className='sr-only'>Close</span>
            </Button>
          </AlertDialogHeader>

          {selectedLog && (
            <>
              <div className='my-4 border-t border-muted' />
              <div className='space-y-4'>
                <div>
                  <h3 className='mb-1 text-sm font-medium'>Details</h3>
                  <p className='text-sm text-muted-foreground'>{selectedLog.details}</p>
                </div>
                <div>
                  <h3 className='mb-1 text-sm font-medium'>Response</h3>
                  <div className='max-h-[300px] overflow-y-auto'>
                    <div className='whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-sm'>
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
  );
}
