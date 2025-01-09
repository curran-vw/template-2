import { useState } from 'react'
import { useToast } from '@/app/components/common/use-toast'
import { useWorkspace } from '@/app/lib/hooks/useWorkspace'

export function useCrawler() {
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlError, setCrawlError] = useState<string | null>(null)
  const { toast } = useToast()
  const { workspace } = useWorkspace()

  const crawlWebsite = async (url: string, agentId?: string) => {
    setIsCrawling(true)
    setCrawlError(null)

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          url,
          workspaceId: workspace?.id,
          agentId 
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to crawl website')
      }

      const data = await response.json()
      
      toast({
        title: 'Website crawled successfully',
        description: 'Content has been summarized and saved',
      })

      return data

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to crawl website'
      setCrawlError(message)
      toast({
        title: 'Failed to crawl website',
        description: message,
        variant: 'destructive'
      })
      return null
    } finally {
      setIsCrawling(false)
    }
  }

  return {
    crawlWebsite,
    isCrawling,
    crawlError
  }
} 