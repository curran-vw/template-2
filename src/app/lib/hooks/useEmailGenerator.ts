import { useState } from 'react'
import { useToast } from '@/app/components/common/use-toast'
import { useWorkspace } from '@/app/lib/hooks/useWorkspace'

interface EmailGeneratorProps {
  signupInfo: string
  directive: string
  businessContext: {
    website: string
    purpose: string
    websiteSummary?: string
    additionalContext?: string
  }
  agentId?: string
  onStepChange?: (step: 'user-info' | 'business-info' | 'email-body' | 'subject-line') => void
}

export function useEmailGenerator() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { workspace } = useWorkspace()
  const { toast } = useToast()

  const generateEmail = async ({ 
    signupInfo, 
    directive, 
    businessContext, 
    agentId,
    onStepChange 
  }: EmailGeneratorProps) => {
    setIsLoading(true)
    setError(null)

    try {
      // Create EventSource for progress updates
      const eventSource = new EventSource(`/api/generate-email/progress?id=${Math.random()}`)
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.step) {
          onStepChange?.(data.step)
        }
      }

      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signupInfo,
          directive,
          businessContext,
          workspaceId: workspace?.id,
          agentId
        })
      })

      // Close the event source
      eventSource.close()

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to generate email')
      }

      const data = await response.json()
      return data.email

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate email'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    generateEmail,
    isLoading,
    error,
  }
} 