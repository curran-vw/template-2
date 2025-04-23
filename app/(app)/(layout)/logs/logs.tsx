"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useWorkspace } from "@/hooks/use-workspace";
import * as logsUtils from "@/firebase/logs-utils";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { LogRecord } from "@/firebase/logs-utils";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function Logs() {
  const { workspace } = useWorkspace();
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const agentId = searchParams?.get("agentId") ?? null;
  const [currentPage, setCurrentPage] = useState(1);
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

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ["logs", workspace?.id, agentId, currentPage],
    queryFn: async () => {
      return await logsUtils.getLogs({
        workspaceId: workspace?.id!,
        agentId,
        page: currentPage,
        pageSize: 10,
      });
    },
    enabled: !!workspace?.id,
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

  // Add pagination handlers
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

  if (loading) {
    return (
      <div className='container mx-auto py-6 space-y-6'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-10 w-24' />
        </div>
        <Card>
          <CardHeader className='pb-3'>
            <Skeleton className='h-6 w-32' />
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-6 py-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>System Logs</h1>
        <Button
          onClick={() => refetchLogs()}
          variant='outline'
          size='sm'
          disabled={loading}
          className='flex items-center gap-2'
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className='group hover:bg-muted/50'>
                <TableCell className='font-medium'>{log.timestamp.toLocaleString()}</TableCell>
                <TableCell>{log.agentName}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      log.level === "error"
                        ? "bg-destructive/10 text-destructive"
                        : log.level === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {log.level}
                  </span>
                </TableCell>
                <TableCell>{log.message}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className='text-center'>
                  <div className='flex flex-col items-center justify-center h-32 gap-2'>
                    <RefreshCw className='h-8 w-8 text-muted-foreground/60' />
                    <p className='text-sm text-muted-foreground'>No logs found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {pagination.totalPages > 1 && (
        <Card className='mt-4'>
          <div className='flex items-center justify-between px-4 py-3'>
            <div className='flex flex-1 justify-between sm:hidden'>
              <Button
                onClick={handlePreviousPage}
                disabled={!pagination.hasPreviousPage}
                variant='outline'
                size='sm'
              >
                Previous
              </Button>
              <Button
                onClick={handleNextPage}
                disabled={!pagination.hasNextPage}
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
                    {logs.length > 0 ? (currentPage - 1) * 10 + 1 : 0}
                  </span>{" "}
                  to{" "}
                  <span className='font-medium'>
                    {Math.min(currentPage * 10, pagination.totalLogs)}
                  </span>{" "}
                  of <span className='font-medium'>{pagination.totalLogs}</span> results
                </p>
              </div>
              <div>
                <nav
                  className='isolate inline-flex -space-x-px rounded-md shadow-sm'
                  aria-label='Pagination'
                >
                  <Button
                    onClick={handlePreviousPage}
                    disabled={!pagination.hasPreviousPage}
                    variant='outline'
                    size='sm'
                    className='rounded-l-md'
                  >
                    <ChevronLeft className='h-4 w-4' />
                    <span className='ml-2'>Previous</span>
                  </Button>
                  <div className='flex items-center justify-center px-4 py-2 text-sm font-medium border border-input bg-background'>
                    Page {logs.length > 0 ? currentPage : 0} of {pagination.totalPages}
                  </div>
                  <Button
                    onClick={handleNextPage}
                    disabled={!pagination.hasNextPage}
                    variant='outline'
                    size='sm'
                    className='rounded-r-md'
                  >
                    <span className='mr-2'>Next</span>
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
