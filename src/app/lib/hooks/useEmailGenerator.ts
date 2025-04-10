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
      // Validate required fields
      if (!signupInfo) {
        throw new Error('Signup info is required');
      }

      if (!businessContext || !businessContext.purpose) {
        throw new Error('Business purpose is required');
      }

      // Create EventSource for progress updates
      const eventId = Math.random();
      const eventSource = new EventSource(`/api/generate-email/progress?id=${eventId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.step) {
            onStepChange?.(data.step);
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        eventSource.close();
      };

      // Add a timeout to close the event source after a certain time
      const timeoutId = setTimeout(() => {
        console.log('Closing EventSource due to timeout');
        eventSource.close();
      }, 120000); // 2 minutes timeout

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
      });

      // Clear timeout and close the event source
      clearTimeout(timeoutId);
      eventSource.close();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.details || errorData.error || 'Failed to generate email');
      }

      const data = await response.json();
      return data.email;

    } catch (error) {
      console.error('Email generation error:', error);
      toast({
        title: "Email Generation Error",
        description: error instanceof Error 
          ? error.message 
          : 'Failed to generate email. Please try again later.',
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    generateEmail,
    isGenerating
  }
} 