'use client'

import { Mail, Paperclip, Image, Smile, MoreVertical, Minus, Square, X } from 'lucide-react'
import { Button } from "@/app/components/common/button"
import { useToast } from "@/app/components/common/toast-context"

interface EmailPreviewProps {
  to: string
  subject: string
  body: string
}

export function EmailPreview({ to, subject, body }: EmailPreviewProps) {
  const { toast } = useToast()

  const handleSend = () => {
    toast({
      title: "This is just a preview",
      description: "Emails can't be sent from here.",
      variant: "default"
    })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(body)
    toast({
      title: "Copied",
      description: "Email content copied to clipboard",
      variant: "default"
    })
  }

  return (
    <div className="w-full rounded-lg shadow-sm overflow-hidden bg-white border border-gray-200">
      {/* Window Header */}
      <div className="bg-gray-100 px-4 py-2 flex items-center justify-between border-b border-gray-200">
        <span className="text-sm font-medium">New Message</span>
        <div className="flex items-center gap-2">
          <Minus className="h-4 w-4 text-gray-400" />
          <Square className="h-3 w-3 text-gray-400" />
          <X className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Email Content */}
      <div className="p-6 space-y-6">
        {/* Header Fields */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-16">To:</span>
            <div className="flex-1 text-sm">{to}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-16">Subject:</span>
            <div className="flex-1 text-sm font-medium">{subject}</div>
          </div>
        </div>

        {/* Email Body */}
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto text-sm whitespace-pre-wrap pt-4 border-t">
          {body}
        </div>

        {/* Email Footer/Toolbar */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3 text-gray-400">
            <Paperclip className="h-5 w-5 cursor-pointer hover:text-gray-600" aria-label="Attach file" />
            <Image className="h-5 w-5 cursor-pointer hover:text-gray-600" aria-label="Insert image" />
            <Smile className="h-5 w-5 cursor-pointer hover:text-gray-600" aria-label="Insert emoji" />
            <MoreVertical className="h-5 w-5 cursor-pointer hover:text-gray-600" aria-label="More options" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy}>
              Copy
            </Button>
            <Button onClick={handleSend}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

