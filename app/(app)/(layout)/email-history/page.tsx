"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  X,
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

const formatMarkdownContent = (content: string | undefined) => {
  if (!content) return [];

  return content
    .split("\n\n")
    .filter((section) => section.trim())
    .map((section) => {
      // Keep bold markers for now - we'll handle them in the render
      return section.replace(/\[[\d\]]/g, "").trim(); // Remove reference numbers [1], [2], etc.
    });
};

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
      return await emailHistoryUtils.getEmailHistory({
        workspaceId: workspace?.id!,
        agentId,
        page: currentPage,
        pageSize: 10,
      });
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

  const [isSending, setIsSending] = useState(false);
  const handleApprove = async (emailId: string) => {
    if (!workspace?.id) return;

    setIsSending(true);
    const { success, error } = await emailHistoryUtils.updateEmailStatusToSent({
      emailId,
    });
    if (success) {
      toast.success("Success", {
        description: success,
      });
      refetchEmails(); // Refresh the list
    } else {
      toast.error("Error", {
        description: error,
      });
    }
    setIsSending(false);
  };
  // const handleDeny = async (emailId: string) => {
  //   if (!workspace?.id) return;

  //   const { success, error } = await emailHistoryUtils.updateEmailStatusToDenied({
  //     emailId,
  //   });
  //   if (success) {
  //     toast.success("Success", {
  //       description: "Email denied successfully",
  //     });
  //     refetchEmails(); // Refresh the list
  //   } else {
  //     toast.error("Error", {
  //       description: error,
  //     });
  //   }
  // };

  const formatContent = (content: any): string => {
    if (typeof content === "string") return content;
    if (typeof content === "object") {
      try {
        return JSON.stringify(content, null, 2);
      } catch {
        return String(content);
      }
    }
    return String(content);
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
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((email) => (
              <React.Fragment key={email.id}>
                <TableRow className='group hover:bg-muted/50'>
                  <TableCell className='font-medium'>{email.recipientEmail}</TableCell>
                  <TableCell>{email.agentName}</TableCell>
                  <TableCell>{email.status}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{email.createdAt}</span>
                        </TooltipTrigger>
                        <TooltipContent>{email.createdAt}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100'>
                      {email.status === "under_review" && (
                        <Button onClick={() => handleApprove(email.id)} className='gap-2'>
                          {isSending ? <LoadingSpinner /> : <Send />}
                          <span>Send</span>
                        </Button>
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
                                    <span className='text-sm font-medium'>
                                      {formatContent(email.subject)}
                                    </span>
                                  </div>
                                  <div className='border-t pt-4'>
                                    <div
                                      className='prose prose-sm max-w-none text-muted-foreground'
                                      dangerouslySetInnerHTML={{
                                        __html: formatContent(email.body)
                                          .replace(/<[^>]*>/g, "")
                                          .split("\n")
                                          .filter((line) => line.trim())
                                          .map((line) => {
                                            if (
                                              line.match(
                                                /^(Hey|Hi|Dear|Hello|Best|Regards|Sincerely|Thanks|Thank you)/,
                                              )
                                            ) {
                                              return `<div class="mb-4">${line}</div>`;
                                            }
                                            return `<div class="mb-4">${line}</div>`;
                                          })
                                          .join(""),
                                      }}
                                    />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Details Tabs - Right Side (2 columns) */}
                          <div className='col-span-2'>
                            <Card>
                              <CardHeader className='pb-3 border-b'>
                                <CardTitle className='text-base'>Welcome Agent Research</CardTitle>
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
                                    <div className='max-h-[500px] space-y-4 overflow-y-auto rounded-md bg-muted/30 p-4'>
                                      {email.userInfo ? (
                                        formatMarkdownContent(email.userInfo).map(
                                          (section, index) => (
                                            <div key={index} className='text-sm'>
                                              {section.split("\n").map((line, lineIndex) => {
                                                const boldText = line.match(/\*\*.*?\*\*/g);

                                                if (boldText) {
                                                  const parts = line.split(/(\*\*.*?\*\*)/);
                                                  return (
                                                    <div key={lineIndex} className='mb-2'>
                                                      {parts.map((part, partIndex) => {
                                                        if (
                                                          part.startsWith("**") &&
                                                          part.endsWith("**")
                                                        ) {
                                                          // It's bold text
                                                          return (
                                                            <span
                                                              key={partIndex}
                                                              className='font-semibold'
                                                            >
                                                              {part.replace(/\*\*/g, "")}
                                                            </span>
                                                          );
                                                        }
                                                        return <span key={partIndex}>{part}</span>;
                                                      })}
                                                    </div>
                                                  );
                                                }

                                                // Handle lists
                                                if (line.startsWith("- ")) {
                                                  return (
                                                    <div key={lineIndex} className='mb-1 ml-4 flex'>
                                                      <span className='mr-2'>•</span>
                                                      <span>{line.substring(2)}</span>
                                                    </div>
                                                  );
                                                }

                                                // Handle headers (lines ending with :)
                                                if (line.endsWith(":")) {
                                                  return (
                                                    <h4
                                                      key={lineIndex}
                                                      className='mb-2 mt-4 font-medium'
                                                    >
                                                      {line}
                                                    </h4>
                                                  );
                                                }

                                                // Regular text
                                                return (
                                                  <div
                                                    key={lineIndex}
                                                    className='mb-2 text-muted-foreground'
                                                  >
                                                    {line}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ),
                                        )
                                      ) : (
                                        <div className='flex flex-col items-center justify-center py-6 text-center'>
                                          <AlertCircle className='h-8 w-8 text-muted-foreground/60 mb-2' />
                                          <p className='text-sm text-muted-foreground'>
                                            No personal details available
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </TabsContent>

                                  <TabsContent
                                    value='business'
                                    className='mt-0 focus-visible:outline-none focus-visible:ring-0'
                                  >
                                    <div className='max-h-[500px] space-y-4 overflow-y-auto rounded-md bg-muted/30 p-4'>
                                      {email.businessInfo ? (
                                        formatMarkdownContent(email.businessInfo).map(
                                          (section, index) => (
                                            <div key={index} className='text-sm'>
                                              {section.split("\n").map((line, lineIndex) => {
                                                const boldText = line.match(/\*\*.*?\*\*/g);

                                                if (boldText) {
                                                  const parts = line.split(/(\*\*.*?\*\*)/);
                                                  return (
                                                    <div key={lineIndex} className='mb-2'>
                                                      {parts.map((part, partIndex) => {
                                                        if (
                                                          part.startsWith("**") &&
                                                          part.endsWith("**")
                                                        ) {
                                                          return (
                                                            <span
                                                              key={partIndex}
                                                              className='font-semibold'
                                                            >
                                                              {part.replace(/\*\*/g, "")}
                                                            </span>
                                                          );
                                                        }
                                                        return <span key={partIndex}>{part}</span>;
                                                      })}
                                                    </div>
                                                  );
                                                }

                                                // Handle lists
                                                if (line.startsWith("- ")) {
                                                  return (
                                                    <div key={lineIndex} className='mb-1 ml-4 flex'>
                                                      <span className='mr-2'>•</span>
                                                      <span>{line.substring(2)}</span>
                                                    </div>
                                                  );
                                                }

                                                // Handle headers
                                                if (line.endsWith(":")) {
                                                  return (
                                                    <h4
                                                      key={lineIndex}
                                                      className='mb-2 mt-4 font-medium'
                                                    >
                                                      {line}
                                                    </h4>
                                                  );
                                                }

                                                // Regular text
                                                return (
                                                  <div
                                                    key={lineIndex}
                                                    className='mb-2 text-muted-foreground'
                                                  >
                                                    {line}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ),
                                        )
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
            ))}
            {emails.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className='text-center'>
                  <div className='flex flex-col items-center justify-center h-32 gap-2'>
                    <Mail className='h-8 w-8 text-muted-foreground/60' />
                    <p className='text-sm text-muted-foreground'>No emails found.</p>
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
                    {emails.length > 0 ? (currentPage - 1) * 10 + 1 : 0}
                  </span>{" "}
                  to{" "}
                  <span className='font-medium'>
                    {Math.min(currentPage * 10, pagination.totalEmails)}
                  </span>{" "}
                  of <span className='font-medium'>{pagination.totalEmails}</span> results
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
                    Page {emails.length > 0 ? currentPage : 0} of {pagination.totalPages}
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
