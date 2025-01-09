export interface WelcomeAgent {
  id?: string
  workspaceId: string
  name: string
  status: 'draft' | 'published'
  createdAt: number
  updatedAt: number
  lastModified: number
  emailPurpose: {
    preset: string
    directive: string
  }
  businessContext: {
    website: string
    purpose: string
    additionalContext?: string
  }
  configuration: {
    emailAccount?: string
    notificationEmail?: string
    settings: {
      sendOnlyWhenConfident: boolean
      reviewBeforeSending: boolean
    }
  }
  lastTestEmail?: {
    to: string
    subject: string
    body: string
  }
} 