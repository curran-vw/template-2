"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  User,
  Building,
  Mail,
  RefreshCw,
  AlertCircle,
  Send,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { useWorkspace } from "@/hooks/use-workspace";
import * as emailHistoryUtils from "@/firebase/email-history-utils";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { EmailRecord } from "@/firebase/email-history-utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmailHistory() {
  const { workspace } = useWorkspace();
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const agentId = searchParams?.get("agentId") ?? null;
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{
    totalPages: number;
    totalEmails: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>({
    totalPages: 1,
    totalEmails: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const { data: emailsData, refetch: refetchEmails } = useQuery({
    queryKey: ["email-history", workspace?.id, agentId, currentPage],
    queryFn: async () => {
      setLoading(true);
      const res = await emailHistoryUtils.getEmailHistory({
        workspaceId: workspace?.id!,
        agentId,
        page: currentPage,
        pageSize: 10,
      });
      setLoading(false);
      return res;
    },
    enabled: !!workspace?.id,
  });

  useEffect(() => {
    if (emailsData) {
      setEmails(emailsData.emails || []);
      setPagination(
        emailsData.pagination || {
          totalPages: 1,
          totalEmails: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      );
      setLoading(false);
    }
  }, [emailsData]);
  const [isSending, setIsSending] = useState<null | string>(null);
  const [isDenying, setIsDenying] = useState<null | string>(null);
  const [confirmSendDialogOpen, setConfirmSendDialogOpen] = useState(false);
  const [confirmDenyDialogOpen, setConfirmDenyDialogOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const handleApprove = async (emailId: string) => {
    if (!workspace?.id) return;

    setIsSending(emailId);
    const { success, error } = await emailHistoryUtils.updateEmailStatusToSent({
      emailId,
    });
    if (success) {
      toast.success("Success", {
        description: success,
      });
      refetchEmails();
    } else {
      toast.error("Error", {
        description: error,
      });
    }
    setIsSending(null);
    setConfirmSendDialogOpen(false);
  };

  const handleDeny = async (emailId: string) => {
    if (!workspace?.id) return;

    setIsDenying(emailId);
    const { success, error } = await emailHistoryUtils.updateEmailStatusToDenied({
      emailId,
    });
    if (success) {
      toast.success("Success", {
        description: "Email has been denied",
      });
      refetchEmails();
    } else {
      toast.error("Error", {
        description: error || "Failed to deny email",
      });
    }
    setIsDenying(null);
    setConfirmDenyDialogOpen(false);
  };

  const openSendConfirmDialog = (emailId: string) => {
    setSelectedEmailId(emailId);
    setConfirmSendDialogOpen(true);
  };

  const openDenyConfirmDialog = (emailId: string) => {
    setSelectedEmailId(emailId);
    setConfirmDenyDialogOpen(true);
  };

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

  return (
    <div className='container mx-auto space-y-6 py-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Email History</h1>
        <Button
          onClick={() => refetchEmails()}
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
              <TableHead>Recipient</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <>
                <TableRow>
                  <TableCell colSpan={5} className='text-center'>
                    <Skeleton className='h-8 w-full' />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className='text-center'>
                    <Skeleton className='h-8 w-full' />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className='text-center'>
                    <Skeleton className='h-8 w-full' />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className='text-center'>
                    <Skeleton className='h-8 w-full' />
                  </TableCell>
                </TableRow>
              </>
            ) : emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center'>
                  <div className='flex flex-col items-center justify-center h-32 gap-2'>
                    <Mail className='h-8 w-8 text-muted-foreground/60' />
                    <p className='text-sm text-muted-foreground'>No emails found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              emails.map((email) => (
                <React.Fragment key={email.id}>
                  <TableRow className='group hover:bg-muted/50'>
                    <TableCell className='font-medium'>{email.recipientEmail}</TableCell>
                    <TableCell>{email.agentName}</TableCell>
                    <TableCell className='uppercase'>{email.status}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{email.createdAt.toLocaleString()}</span>
                          </TooltipTrigger>
                          <TooltipContent>{email.createdAt.toLocaleString()}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100'>
                        {email.status === "under_review" && (
                          <>
                            <Button
                              onClick={() => openSendConfirmDialog(email.id)}
                              className='gap-2'
                              variant='default'
                            >
                              {isSending === email.id ? (
                                <LoadingSpinner />
                              ) : (
                                <Send className='h-4 w-4' />
                              )}
                              <span>Send</span>
                            </Button>
                            <Button
                              onClick={() => openDenyConfirmDialog(email.id)}
                              className='gap-2'
                              variant='destructive'
                            >
                              {isDenying === email.id ? (
                                <LoadingSpinner />
                              ) : (
                                <X className='h-4 w-4 text-white' />
                              )}
                              <span>Deny</span>
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={() =>
                            setExpandedEmail(expandedEmail === email.id ? null : email.id)
                          }
                          variant='ghost'
                          size='sm'
                          className='text-primary hover:bg-primary/10 hover:text-primary'
                        >
                          {expandedEmail === email.id ? (
                            <ChevronUp className='h-4 w-4' />
                          ) : (
                            <ChevronDown className='h-4 w-4' />
                          )}
                          <span className='ml-2'>Preview</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedEmail === email.id && (
                    <TableRow>
                      <TableCell colSpan={5} className='bg-muted/30 p-0'>
                        <div className='p-6'>
                          <div className='grid grid-cols-5 gap-6'>
                            {/* Email Preview - Left Side (3 columns) */}
                            <div className='col-span-3'>
                              <Card>
                                <CardHeader className='pb-3 border-b'>
                                  <CardTitle className='flex items-center gap-2 text-base'>
                                    <Mail className='h-4 w-4' />
                                    Email Preview
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className='pt-4'>
                                  <div className='space-y-4'>
                                    <div className='flex items-center'>
                                      <span className='text-sm font-medium text-muted-foreground w-20'>
                                        To:
                                      </span>
                                      <span className='text-sm'>{email.recipientEmail}</span>
                                    </div>
                                    <div className='flex items-center'>
                                      <span className='text-sm font-medium text-muted-foreground w-20'>
                                        Subject:
                                      </span>
                                      <span className='text-sm font-medium'>{email.subject}</span>
                                    </div>
                                    {email.error && (
                                      <div className='flex items-start mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/20'>
                                        <AlertCircle className='h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0' />
                                        <div className='space-y-1'>
                                          <p className='text-sm font-medium text-destructive'>
                                            Error
                                          </p>
                                          <p className='text-sm text-destructive/90'>
                                            {email.error}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    <div className='border-t pt-4'>
                                      <div className='prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap'>
                                        {email.body}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Details Tabs - Right Side (2 columns) */}
                            <div className='col-span-2'>
                              <Card>
                                <CardHeader className='pb-3 border-b'>
                                  <CardTitle className='text-base'>
                                    Welcome Agent Research
                                  </CardTitle>
                                  <CardDescription>
                                    This is the research the welcome agent AI did on your lead to
                                    generate the email.
                                  </CardDescription>
                                </CardHeader>

                                <Tabs defaultValue='personal' className='w-full'>
                                  <div className='p-4'>
                                    <TabsList className='grid w-full grid-cols-2'>
                                      <TabsTrigger
                                        value='personal'
                                        className='flex items-center gap-2'
                                      >
                                        <User className='h-4 w-4' />
                                        Personal Details
                                      </TabsTrigger>
                                      <TabsTrigger
                                        value='business'
                                        className='flex items-center gap-2'
                                      >
                                        <Building className='h-4 w-4' />
                                        Business Details
                                      </TabsTrigger>
                                    </TabsList>
                                  </div>

                                  <div className='px-4 pb-4'>
                                    <TabsContent
                                      value='personal'
                                      className='mt-0 focus-visible:outline-none focus-visible:ring-0'
                                    >
                                      <div className='max-h-[500px] whitespace-pre-wrap space-y-4 overflow-y-auto rounded-md bg-muted/30 p-4'>
                                        {email.userInfo}
                                      </div>
                                    </TabsContent>

                                    <TabsContent
                                      value='business'
                                      className='mt-0 focus-visible:outline-none focus-visible:ring-0'
                                    >
                                      <div className='max-h-[500px] space-y-4 overflow-y-auto rounded-md bg-muted/30 p-4'>
                                        {email.businessContext ? (
                                          <div className='prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap'>
                                            <p>
                                              <strong>Website:</strong>{" "}
                                              {email.businessContext.website}
                                            </p>
                                            <p>
                                              <strong>Purpose:</strong>{" "}
                                              {email.businessContext.purpose}
                                            </p>
                                            {email.businessContext.additionalContext && (
                                              <p>
                                                <strong>Additional Context:</strong>{" "}
                                                {email.businessContext.additionalContext}
                                              </p>
                                            )}
                                            {email.businessContext.websiteSummary && (
                                              <p>
                                                <strong>Website Summary:</strong>{" "}
                                                {email.businessContext.websiteSummary}
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <div className='flex flex-col items-center justify-center py-6 text-center'>
                                            <AlertCircle className='h-8 w-8 text-muted-foreground/60 mb-2' />
                                            <p className='text-sm text-muted-foreground'>
                                              No business details available
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </TabsContent>
                                  </div>
                                </Tabs>
                              </Card>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
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
                    {emails.length > 0 ? (currentPage - 1) * 10 + 1 : 0}
                  </span>{" "}
                  to{" "}
                  <span className='font-medium'>
                    {Math.min(currentPage * 10, pagination.totalEmails)}
                  </span>{" "}
                  of <span className='font-medium'>{pagination.totalEmails}</span> results
                </p>
              </div>
              <div className='flex items-center justify-center px-4 py-2 text-sm font-medium'>
                <Button
                  onClick={handlePreviousPage}
                  disabled={!pagination.hasPreviousPage}
                  variant='outline'
                  size='sm'
                  className='rounded-r-none'
                >
                  <ChevronLeft className='h-4 w-4' />
                  <span className='ml-2'>Previous</span>
                </Button>
                <div className='flex items-center justify-center px-4 h-8 text-sm font-medium border border-input bg-background'>
                  Page {emails.length > 0 ? currentPage : 0} of {pagination.totalPages}
                </div>
                <Button
                  onClick={handleNextPage}
                  disabled={!pagination.hasNextPage}
                  variant='outline'
                  size='sm'
                  className='rounded-l-none'
                >
                  <span className='mr-2'>Next</span>
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Send Confirmation Dialog */}
      <Dialog open={confirmSendDialogOpen} onOpenChange={setConfirmSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send Email</DialogTitle>
            <DialogDescription>
              Are you sure you want to send this email? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedEmailId && handleApprove(selectedEmailId)}
              disabled={isSending !== null}
              className='gap-2'
            >
              {isSending ? <LoadingSpinner /> : <Check className='h-4 w-4' />}
              Confirm Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Confirmation Dialog */}
      <Dialog open={confirmDenyDialogOpen} onOpenChange={setConfirmDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deny Email</DialogTitle>
            <DialogDescription>
              Are you sure you want to deny this email? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => selectedEmailId && handleDeny(selectedEmailId)}
              disabled={isDenying !== null}
              className='gap-2'
            >
              {isDenying ? <LoadingSpinner /> : <X className='h-4 w-4' />}
              Confirm Deny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
