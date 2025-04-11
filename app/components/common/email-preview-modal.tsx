'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'
import { Eye } from 'lucide-react'
import { useState } from 'react'

interface EmailPreviewModalProps {
  email: {
    recipientEmail: string
    subject: string
    body: string
    createdAt: Date
  }
}

export function EmailPreviewModal({ email }: EmailPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Format the email body by:
  // 1. Converting line breaks to <br> tags
  // 2. Adding paragraph spacing
  // 3. Preserving greeting and signature spacing
  const formatEmailBody = (body: string) => {
    return (
      body
        // Split into paragraphs
        .split(/\n\n+/)
        // Process each paragraph
        .map((paragraph) =>
          paragraph
            // Convert single line breaks to <br>
            .replace(/\n/g, '<br>')
            // Add extra spacing for greetings and signatures
            .replace(
              /^(Hey|Hi|Dear|Hello|Best|Regards|Sincerely|Thanks|Thank you)(,|\s|$)/,
              '<span class="inline-block mb-2">$1$2</span>',
            ),
        )
        // Wrap each paragraph in a div with margin
        .map((paragraph) => `<div class="mb-4">${paragraph}</div>`)
        .join('')
    )
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="sm"
        className="hover:bg-blue-50 hover:text-blue-600"
      >
        <Eye className="h-4 w-4" />
        <span className="ml-2">View Email</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 border-b pb-4">
              <div className="flex gap-2">
                <span className="font-medium w-16">To:</span>
                <span>{email.recipientEmail}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium w-16">Subject:</span>
                <span>{email.subject}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium w-16">Sent:</span>
                <span>
                  {email.createdAt.toLocaleDateString()} at{' '}
                  {email.createdAt.toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <div
                className="prose prose-sm max-w-none text-gray-900 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: formatEmailBody(email.body),
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
