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
  const [isGenerating, setIsGenerating] = useState(false)
  const { workspace } = useWorkspace()
  const { toast } = useToast()

  const generateEmail = async ({ 
    signupInfo, 
    directive, 
    businessContext, 
    agentId,
    onStepChange 
  }: EmailGeneratorProps) => {
    setIsGenerating(true)

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
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate email')
      }

      const data = await response.json()
      return data.email

    } catch (error) {
      console.error('Email generation error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate email',
        variant: "destructive"
      })
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generateEmail,
    isGenerating
  }
} 