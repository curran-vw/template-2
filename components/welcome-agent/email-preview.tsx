"use client";

import {
  Paperclip,
  ImageIcon,
  Smile,
  MoreVertical,
  Minus,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "../ui/skeleton";

interface EmailPreviewProps {
  to: string;
  subject: string;
  body: string;
  loading?: boolean;
}

export function EmailPreview({
  to,
  subject,
  body,
  loading,
}: EmailPreviewProps) {
  const handleSend = () => {
    toast.success("This is just a preview", {
      description: "Emails can't be sent from here.",
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    toast.success("Copied", {
      description: "Email content copied to clipboard",
    });
  };

  return (
    <div className='w-full overflow-hidden rounded-lg border border-border bg-background shadow-sm'>
      {/* Window Header */}
      <div className='flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2'>
        <span className='text-sm font-medium'>New Message</span>
        <div className='flex items-center gap-2'>
          <Minus className='h-4 w-4 text-muted-foreground' />
          <Square className='h-3 w-3 text-muted-foreground' />
          <X className='h-4 w-4 text-muted-foreground' />
        </div>
      </div>

      {/* Email Content */}
      <div className='space-y-6 p-6'>
        {/* Header Fields */}
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <span className='w-16 text-sm text-muted-foreground'>To:</span>
            <div className='flex-1 text-sm'>{to}</div>
          </div>
          <div className='flex items-center gap-2'>
            <span className='w-16 text-sm text-muted-foreground'>Subject:</span>
            <div className='flex-1 text-sm font-medium'>{subject}</div>
          </div>
        </div>

        {/* Email Body */}
        {loading ? (
          <Skeleton className='h-[200px] w-full' />
        ) : (
          <div className='min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap border-t pt-4 text-sm'>
            {body}
          </div>
        )}

        {/* Email Footer/Toolbar */}
        <div className='flex items-center justify-between border-t pt-4'>
          <div className='flex items-center gap-3 text-muted-foreground'>
            <Paperclip
              className='h-5 w-5 cursor-pointer hover:text-foreground'
              aria-label='Attach file'
            />
            <ImageIcon
              className='h-5 w-5 cursor-pointer hover:text-foreground'
              aria-label='Insert image'
            />
            <Smile
              className='h-5 w-5 cursor-pointer hover:text-foreground'
              aria-label='Insert emoji'
            />
            <MoreVertical
              className='h-5 w-5 cursor-pointer hover:text-foreground'
              aria-label='More options'
            />
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={handleCopy}>
              Copy
            </Button>
            <Button onClick={handleSend}>Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
