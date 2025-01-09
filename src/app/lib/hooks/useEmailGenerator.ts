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
}

export function useEmailGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const { workspace } = useWorkspace()
  const { toast } = useToast()

  const generateEmail = async ({ signupInfo, directive, businessContext, agentId }: EmailGeneratorProps) => {
    setIsGenerating(true)

    try {
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