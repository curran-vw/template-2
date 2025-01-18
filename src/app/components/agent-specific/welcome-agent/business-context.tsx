'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/app/components/common/input'
import { Textarea } from '@/app/components/common/textarea'
import { Button } from '@/app/components/common/button'
import { Loader2, Check, X, ChevronRight } from 'lucide-react'
import { useCrawler } from '@/app/lib/hooks/useCrawler'
import { Checkbox } from "@/app/components/common/checkbox"
import { Label } from "@/app/components/common/label"
import { cn } from "@/lib/utils"

interface BusinessContextProps {
  website: string
  purpose: string
  additionalContext?: string
  websiteSummary?: string
  onWebsiteChange: (value: string) => void
  onPurposeChange: (value: string) => void
  onAdditionalContextChange: (value: string) => void
  onWebsiteSummaryChange: (summary: string) => void
  agentId?: string
}

export function BusinessContext({
  website,
  purpose,
  additionalContext,
  websiteSummary: initialWebsiteSummary,
  onWebsiteChange,
  onPurposeChange,
  onAdditionalContextChange,
  onWebsiteSummaryChange,
  agentId
}: BusinessContextProps) {
  const { crawlWebsite, isCrawling, crawlError } = useCrawler()
  const [hasCrawled, setHasCrawled] = useState(false)
  const [crawlStatus, setCrawlStatus] = useState<'idle' | 'success' | 'failed'>('idle')
  const [showAdditionalContext, setShowAdditionalContext] = useState(!!additionalContext)
  const [websiteSummary, setWebsiteSummary] = useState(initialWebsiteSummary || '')
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false)

  useEffect(() => {
    if (initialWebsiteSummary) {
      setWebsiteSummary(initialWebsiteSummary)
      setCrawlStatus('success')
    }
  }, [initialWebsiteSummary])

  useEffect(() => {
    setShowAdditionalContext(!!additionalContext)
  }, [additionalContext])

  const handleCrawl = async () => {
    if (!website) return

    // Normalize the URL
    let normalizedUrl = website
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    const result = await crawlWebsite(normalizedUrl, agentId)
    
    if (result?.success) {
      setCrawlStatus('success')
      setHasCrawled(true)
      setWebsiteSummary(result.summary)
      onWebsiteSummaryChange(result.summary)
    } else {
      setCrawlStatus('failed')
      setHasCrawled(true)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Website URL</label><br></br>
        <span className="text-xs text-gray-500">We will crawl this website to get more information about your business</span>
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com"
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleCrawl}
            disabled={!website || isCrawling}
            variant={crawlStatus === 'failed' ? 'destructive' : 'outline'}
            className="min-w-[90px] h-9 text-xs"
          >
            {isCrawling ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Crawling...
              </>
            ) : crawlStatus === 'success' ? (
              <>
                <Check className="mr-1 h-3 w-3" />
                Crawled
              </>
            ) : crawlStatus === 'failed' ? (
              <>
                <X className="mr-1 h-3 w-3" />
                Failed
              </>
            ) : (
              'Crawl Page'
            )}
          </Button>
        </div>
        {crawlError && (
          <p className="text-sm text-red-500 mt-1">
            {crawlError}. Please add your business information manually below.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          What are people signing up for?
        </label>
        <Textarea
          placeholder="Describe what users are signing up for (e.g., 'Our monthly newsletter about AI trends')"
          value={purpose}
          onChange={(e) => onPurposeChange(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center">
          <Checkbox
            id="show-additional-context"
            checked={showAdditionalContext}
            onCheckedChange={(checked) => setShowAdditionalContext(checked === true)}
          />
          <Label htmlFor="show-additional-context" className="text-sm font-medium ml-2">
            Add additional context
          </Label>
        </div>
        {showAdditionalContext && (
          <Textarea 
            placeholder="Any other relevant information about your business"
            value={additionalContext}
            onChange={(e) => onAdditionalContextChange(e.target.value)}
            className="mt-2 min-h-[100px]"
          />
        )}
      </div>

      {/* Only show website summary after successful crawl */}
      {crawlStatus === 'success' && websiteSummary && (
        <div className="space-y-2">
          <button 
            onClick={() => setIsSummaryCollapsed(prev => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors w-full"
          >
            <ChevronRight 
              className={cn(
                "h-4 w-4 transition-transform",
                !isSummaryCollapsed && "rotate-90"
              )} 
            />
            Website Summary
          </button>
          <div className={cn(
            "transition-all duration-200 ease-in-out overflow-hidden",
            isSummaryCollapsed ? "max-h-0 opacity-0" : "max-h-[300px] opacity-100"
          )}>
            <Textarea
              value={websiteSummary}
              readOnly
              className="min-h-[100px] bg-gray-50"
            />
          </div>
        </div>
      )}
    </div>
  )
} 