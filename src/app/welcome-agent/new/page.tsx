'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from "@/app/components/common/button"
import { Input } from "@/app/components/common/input"
import { Label } from "@/app/components/common/label"
import { Textarea } from "@/app/components/common/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/common/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/common/card"
import { ArrowLeft, Save, Sparkles, Pencil, Check, Settings, Mail, Play, Copy, X, ChevronDown, Trash2, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { EmailPreview } from '@/app/components/agent-specific/welcome-agent/email-preview'
import { CollapsibleCard } from '@/app/components/common/collapsible-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/common/dialog"
import { Checkbox } from "@/app/components/common/checkbox"
import { RadioGroup, RadioGroupItem } from "@/app/components/common/radio-group"
import { Badge } from "@/app/components/common/badge"
import { Separator } from "@/app/components/common/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/common/dropdown-menu"
import { useWorkspace } from '@/app/lib/hooks/useWorkspace'
import { welcomeAgentUtils } from '@/app/lib/firebase/welcomeAgentUtils'
import { useToast } from '@/app/components/common/use-toast'
import { ConfirmDialog } from '@/app/components/common/confirm-dialog'
import { cn } from "@/lib/utils"
import { Tooltip } from "@/app/components/common/tooltip"
import { BusinessContext } from '@/app/components/agent-specific/welcome-agent/business-context'
import { useEmailGenerator } from '@/app/lib/hooks/useEmailGenerator'
import { EmailGenerationDialog } from '@/app/components/agent-specific/welcome-agent/email-generation-dialog'
import { ConnectGmail } from "@/components/common/agent-specific/welcome-agent/connect-gmail"
import { useAuth } from '@/lib/hooks/useAuth'
import { gmailUtils } from '@/app/lib/firebase/gmailUtils'
import { mailgunUtils } from '@/app/lib/firebase/mailgunUtils'
import { OnboardingTooltip } from "@/app/components/agent-specific/welcome-agent/onboarding-tooltip"

const presetDirectives = [
  { 
    value: "industry-expert", 
    label: "Position yourself as an industry expert", 
    content: "Share industry insights about their competitors' challenges and invite them to a call to show what we've done for companies similar to theirs." 
  },
  { 
    value: "simple-custom-welcome", 
    label: "Simple customized welcome email", 
    content: "Welcome them personalized insights about their business fit and benefits. End with an invitation to an onboarding call." 
  },
  { 
    value: "success-story", 
    label: "Share a success story", 
    content: "Share a relevant success story from their industry and invite them to discuss achieving similar results." 
  },
  { 
    value: "book-call", 
    label: "Suggest a quick call", 
    content: "Highlight how we help similar companies and invite them to book a 15-minute intro call." 
  },
  { 
    value: "product-demo", 
    label: "Invite to product demo", 
    content: "Highlight relevant features for their role and invite them to schedule a personalized demo this week." 
  },
  { 
    value: "custom-upsell", 
    label: "Upsell with a custom loom video", 
    content: "Highlight ROI-focused features and ask if they'd like a Loom video to see the potential impact it could create for their business." 
  },
  {
    value: "super-short",
    label: "Super short email",
    content: "Generate a super-short, personalized email (1-2 sentences and only 1 paragraph). End with this exact call to action: &apos;Want me to send over some more info?&apos;."
  },
  { 
    value: "fully-custom", 
    label: "Custom", 
    content: " " 
  },
]

type EmailGenerationStep = 'user-info' | 'business-info' | 'email-body' | 'subject-line'
type GenerationStep = Exclude<EmailGenerationStep, 'subject-line'> | null

export default function WelcomeAgentNew() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams?.get('edit') || undefined
  const shouldOpenConfigure = searchParams?.get('configure') === 'true'
  const { workspace } = useWorkspace()
  const { toast } = useToast()
  const { user, isReady } = useAuth()
  const [signupInfo, setSignupInfo] = useState("Name: Curran Van Waarde\nEmail: Curran@Agentfolio.ai\nWebsite: Agentfolio.ai\nRole: Founder")
  const [directive, setDirective] = useState("")
  const [selectedDirective, setSelectedDirective] = useState("")
  const [agentName, setAgentName] = useState("Custom Welcome Agent")
  const [isEditingName, setIsEditingName] = useState(false)
  const [emailDetails, setEmailDetails] = useState({ to: 'recipient@example.com', subject: 'Welcome Subject', body: 'Your personalized email will appear here after generation.' })
  const [hasTestedAgent, setHasTestedAgent] = useState(false)
  const [businessInfo, setBusinessInfo] = useState({ website: '', purpose: '', context: '' })
  const [isEmailPurposeOpen, setIsEmailPurposeOpen] = useState(true)
  const [isBusinessContextOpen, setIsBusinessContextOpen] = useState(false)
  const [isSignupInfoDialogOpen, setIsSignupInfoDialogOpen] = useState(false)
  const [isCrawled, setIsCrawled] = useState(false)
  const [showAdditionalContext, setShowAdditionalContext] = useState(false)
  const [isConfigureDrawerOpen, setIsConfigureDrawerOpen] = useState(false)
  const [selectedEmailAccount, setSelectedEmailAccount] = useState("")
  const [notificationEmail, setNotificationEmail] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null)
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    emailPurpose?: string;
    businessPurpose?: string;
    businessWebsite?: string;
  }>({})
  const [openTooltips, setOpenTooltips] = useState<{
    name?: boolean;
    emailPurpose?: boolean;
    businessPurpose?: boolean;
    businessWebsite?: boolean;
  }>({})
  const [websiteSummary, setWebsiteSummary] = useState<string>('')
  const [generationStep, setGenerationStep] = useState<GenerationStep>(null)
  const [isEmailAccountOpen, setIsEmailAccountOpen] = useState(true)
  const [isNewContactsOpen, setIsNewContactsOpen] = useState(false)
  const [isAdditionalSettingsOpen, setIsAdditionalSettingsOpen] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null)
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(!editId)

  // Track initial values
  const [initialValues, setInitialValues] = useState({
    agentName: "Custom Welcome Agent",
    directive: "",
    selectedDirective: "",
    businessInfo: { website: '', purpose: '', context: '' }
  })

  const { generateEmail, isGenerating } = useEmailGenerator()

  // Add new state for settings
  const [settings, setSettings] = useState({
    sendOnlyWhenConfident: false,
    reviewBeforeSending: false
  })

  // Check if current values are different from initial values
  const checkForChanges = useCallback(() => {
    const hasChanges = 
      agentName !== initialValues.agentName ||
      directive !== initialValues.directive ||
      selectedDirective !== initialValues.selectedDirective ||
      businessInfo.website !== initialValues.businessInfo.website ||
      businessInfo.purpose !== initialValues.businessInfo.purpose ||
      businessInfo.context !== initialValues.businessInfo.context

    setHasUnsavedChanges(hasChanges)
  }, [agentName, directive, selectedDirective, businessInfo, initialValues])

  // Update initial values when editing an existing agent
  useEffect(() => {
    const loadAgent = async () => {
      if (!editId) {
        setInitialValues({
          agentName: "Custom Welcome Agent",
          directive: "",
          selectedDirective: "",
          businessInfo: { website: '', purpose: '', context: '' }
        })
        return
      }

      try {
        const agent = await welcomeAgentUtils.getWelcomeAgent(editId)
        if (!agent) return

        // Set initial values from loaded agent
        setInitialValues({
          agentName: agent.name,
          directive: agent.emailPurpose.directive,
          selectedDirective: agent.emailPurpose.preset,
          businessInfo: {
            website: agent.businessContext.website,
            purpose: agent.businessContext.purpose,
            context: agent.businessContext.additionalContext || ''
          }
        })

        // Populate form with existing data
        setAgentName(agent.name)
        setSelectedDirective(agent.emailPurpose.preset)
        setDirective(agent.emailPurpose.directive)
        setBusinessInfo({
          website: agent.businessContext.website,
          purpose: agent.businessContext.purpose,
          context: agent.businessContext.additionalContext || ''
        })
        if (agent.businessContext.websiteSummary) {
          setWebsiteSummary(agent.businessContext.websiteSummary)
        }
        setShowAdditionalContext(!!agent.businessContext.additionalContext)
        
        if (agent.configuration) {
          setSelectedEmailAccount(agent.configuration.emailAccount || '')
          setNotificationEmail(agent.configuration.notificationEmail || null)
        }

        if (agent.lastTestEmail) {
          setEmailDetails(agent.lastTestEmail)
          setHasTestedAgent(true)
        }

        if (agent.configuration?.settings) {
          setSettings({
            sendOnlyWhenConfident: agent.configuration.settings.sendOnlyWhenConfident || false,
            reviewBeforeSending: agent.configuration.settings.reviewBeforeSending || false
          })
        }

        // Reset unsaved changes flag after loading
        setHasUnsavedChanges(false)
      } catch (error) {
        console.error('Error loading agent:', error)
        toast({
          title: "Error",
          description: "Failed to load welcome agent",
          variant: "destructive"
        })
      }
    }

    loadAgent()
  }, [editId, toast])

  // Check for changes whenever relevant values change
  useEffect(() => {
    checkForChanges()
  }, [agentName, directive, selectedDirective, businessInfo, checkForChanges])

  useEffect(() => {
    console.log('Current workspace:', workspace)
  }, [workspace])

  // Open configure drawer if URL parameter is present
  useEffect(() => {
    if (shouldOpenConfigure) {
      setIsConfigureDrawerOpen(true)
      setIsEmailAccountOpen(true)
      setIsNewContactsOpen(false)
      setIsAdditionalSettingsOpen(false)
    }
  }, [shouldOpenConfigure])

  useEffect(() => {
    const loadConnectedAccounts = async () => {
      if (!isReady || !workspace?.id) return

      setIsLoadingAccounts(true)
      try {
        console.log('Loading Gmail connections...')
        const connections = await gmailUtils.getWorkspaceConnections(workspace.id)
        console.log('Loaded connections:', connections)
        setConnectedAccounts(connections)
        
        if (selectedEmailAccount) {
          const accountExists = connections.some(conn => conn.email === selectedEmailAccount)
          if (!accountExists) {
            setSelectedEmailAccount('')
          }
        }
      } catch (error) {
        console.error('Error loading Gmail connections:', error)
        toast({
          title: "Error",
          description: "Failed to load connected Gmail accounts",
          variant: "destructive"
        })
      } finally {
        setIsLoadingAccounts(false)
      }
    }

    loadConnectedAccounts()
  }, [isReady, workspace?.id, selectedEmailAccount, toast])

  const handleNavigateAway = (action: () => void) => {
    if (hasUnsavedChanges) {
      setIsConfirmDialogOpen(true)
      setPendingAction(() => action)
    } else {
      action()
    }
  }

  const handleGoBack = () => {
    handleNavigateAway(() => router.back())
  }

  const toggleSection = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(prev => !prev)
  }, [])

  const handlePresetDirectiveChange = (value: string) => {
    setSelectedDirective(value)
    const selectedPreset = presetDirectives.find(preset => preset.value === value)
    if (selectedPreset) {
      setDirective(selectedPreset.content)
    }
  }

  const handleDirectiveChange = (value: string) => {
    setDirective(value)
  }

  const handleBusinessPurposeChange = (value: string) => {
    if (value.trim()) {
      setValidationErrors(prev => ({ ...prev, businessPurpose: undefined }))
      setOpenTooltips(prev => ({ ...prev, businessPurpose: false }))
    }
    setBusinessInfo(prev => ({ ...prev, purpose: value }))
  }

  const handleAgentNameChange = (value: string) => {
    if (value.trim()) {
      setValidationErrors(prev => ({ ...prev, name: undefined }))
      setOpenTooltips(prev => ({ ...prev, name: false }))
    }
    setAgentName(value)
  }

  const handleTest = () => {
    // Validate required fields
    const errors: typeof validationErrors = {}

    if (!directive.trim()) {
      errors.emailPurpose = "AI directive is required"
      setIsEmailPurposeOpen(true)
    }

    if (!businessInfo.purpose.trim()) {
      errors.businessPurpose = "Sign up purpose is required"
      setIsBusinessContextOpen(true)
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      // Set tooltips to true and don't automatically close them
      setOpenTooltips(prev => ({
        ...prev,
        emailPurpose: errors.emailPurpose ? true : prev.emailPurpose,
        businessPurpose: errors.businessPurpose ? true : prev.businessPurpose
      }))

      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before generating email",
        variant: "destructive"
      })
      return
    }

    setIsSignupInfoDialogOpen(true)
  }

  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
    }
  }, [validationErrors, toast])

  const generateEmailPreview = async () => {
    setIsSignupInfoDialogOpen(false)
    setGenerationStep('user-info')

    const email = await generateEmail({
      signupInfo,
      directive,
      businessContext: {
        website: businessInfo.website,
        purpose: businessInfo.purpose,
        websiteSummary,
        additionalContext: businessInfo.context
      },
      agentId: editId,
      onStepChange: (step: EmailGenerationStep) => {
        if (step === 'subject-line') {
          setGenerationStep(null)
        } else {
          setGenerationStep(step)
        }
      }
    })

    if (email) {
      setEmailDetails(email)
      setHasTestedAgent(true)
    }
    
    setGenerationStep(null)
  }

  const handleGetEmail = () => {
    setNotificationEmail('your-unique-id@welcomeagent.com')
  }

  const handleCopyEmail = () => {
    if (notificationEmail) {
      navigator.clipboard.writeText(notificationEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Add handler for settings changes
  const handleSettingChange = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
    setHasUnsavedChanges(true)
  }

  // Update the handleSave function to include settings
  const handleSave = async (action: 'published' | 'draft') => {
    console.log('Starting save process...', { workspace, action })

    if (!workspace?.id) {
      console.error('No workspace ID found:', workspace)
      toast({
        title: "Error",
        description: "No workspace selected",
        variant: "destructive"
      })
      return
    }

    // Clear previous validation errors
    setValidationErrors({})

    // Only validate required fields when publishing
    if (action === 'published') {
      const errors: typeof validationErrors = {}

      if (!agentName.trim()) {
        errors.name = "Agent name is required"
      }

      if (!directive.trim()) {
        errors.emailPurpose = "AI directive is required"
      }

      if (!businessInfo.purpose.trim()) {
        errors.businessPurpose = "Sign up purpose is required"
      }

      if (Object.keys(errors).length > 0) {
        // Open the collapsed sections if they contain errors
        if (errors.emailPurpose) {
          setIsEmailPurposeOpen(true)
        }
        if (errors.businessPurpose) {
          setIsBusinessContextOpen(true)
        }

        setValidationErrors(errors)
        setOpenTooltips(
          Object.keys(errors).reduce((acc, key) => ({
            ...acc,
            [key]: true
          }), {})
        );

        toast({
          title: "Validation Error",
          description: "Please fill in all required fields before publishing",
          variant: "destructive"
        });

        return;
      }
    }

    try {
      // Create the initial data object
      const agentData = {
        name: agentName.trim() || 'Untitled Welcome Agent',
        status: action,
        emailPurpose: {
          preset: selectedDirective,
          directive: directive.trim()
        },
        businessContext: {
          website: businessInfo.website.trim(),
          purpose: businessInfo.purpose.trim(),
          websiteSummary: websiteSummary,
          ...(businessInfo.context?.trim() ? {
            additionalContext: businessInfo.context.trim()
          } : {})
        },
        configuration: {
          ...(selectedEmailAccount ? { emailAccount: selectedEmailAccount } : {}),
          ...(notificationEmail ? { notificationEmail } : {}),
          settings: {
            sendOnlyWhenConfident: settings.sendOnlyWhenConfident,
            reviewBeforeSending: settings.reviewBeforeSending
          }
        },
        ...(hasTestedAgent && emailDetails ? {
          lastTestEmail: {
            to: emailDetails.to,
            subject: emailDetails.subject,
            body: emailDetails.body
          }
        } : {}),
        lastModified: Date.now()
      }

      // Remove any undefined or null values recursively
      const cleanData = (obj: any): any => {
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([_, v]) => v != null)
            .map(([k, v]) => [
              k,
              v && typeof v === 'object' ? cleanData(v) : v
            ])
        )
      }

      const cleanedAgentData = cleanData(agentData)
      console.log('Cleaned agent data:', cleanedAgentData)

      console.log('Attempting to save to workspace:', workspace.id)
      if (editId) {
        // Update existing agent
        await welcomeAgentUtils.updateWelcomeAgent(editId, cleanedAgentData)
      } else {
        // Create new agent
        await welcomeAgentUtils.createWelcomeAgent(workspace.id, cleanedAgentData)
      }

      // After successful save, update initial values to current values
      setInitialValues({
        agentName: agentName.trim() || 'Untitled Welcome Agent',
        directive: directive.trim(),
        selectedDirective,
        businessInfo: {
          website: businessInfo.website.trim(),
          purpose: businessInfo.purpose.trim(),
          context: businessInfo.context.trim()
        }
      })
      setHasUnsavedChanges(false)
      toast({
        title: "Success",
        description: `Welcome agent ${action === 'published' ? 'published' : 'saved as draft'}`,
        variant: "default"
      })

      router.push('/welcome-agent')
    } catch (error) {
      console.error('Detailed save error:', error)
      toast({
        title: "Error",
        description: "Failed to save welcome agent",
        variant: "destructive"
      })
    }
  }

  // Update the save handlers for the buttons
  const handleSaveAndPublish = () => {
    console.log('Attempting to save and publish...')
    handleSave('published')
  }
  
  const handleSaveAsDraft = () => {
    console.log('Attempting to save as draft...')
    handleSave('draft')
  }

  const handleGmailConnected = async (email: string, name: string, tokens: any) => {
    console.log('Gmail connected callback received:', { email, name })
    
    // Wait for auth to be ready
    if (!isReady) {
      console.log('Waiting for auth to be ready...')
      return
    }

    if (!workspace?.id) {
      console.error('No workspace found')
      toast({
        title: "Error",
        description: "No workspace found",
        variant: "destructive"
      })
      return
    }

    if (!user?.uid) {
      console.error('No authenticated user found')
      toast({
        title: "Error",
        description: "Please sign in to connect Gmail",
        variant: "destructive"
      })
      return
    }

    try {
      console.log('Saving Gmail connection...', {
        workspaceId: workspace.id,
        userId: user.uid,
        email,
        name
      })

      const connectionId = await gmailUtils.saveGmailConnection(
        workspace.id,
        user.uid,
        email,
        name,
        {
          ...tokens,
          expiry_date: Date.now() + (tokens.expires_in * 1000)
        }
      )

      console.log('Gmail connection saved:', connectionId)

      // Reload connected accounts
      const connections = await gmailUtils.getWorkspaceConnections(workspace.id)
      console.log('Loaded connections:', connections)
      setConnectedAccounts(connections)
      
      setSelectedEmailAccount(email)
      
      toast({
        title: "Success",
        description: "Gmail account connected successfully",
      })
    } catch (error) {
      console.error('Error saving Gmail connection:', error)
      toast({
        title: "Error",
        description: "Failed to save Gmail connection",
        variant: "destructive"
      })
    }
  }

  const handleRemoveGmailConnection = async (connectionId: string) => {
    try {
      await gmailUtils.removeConnection(connectionId)
      const connections = await gmailUtils.getWorkspaceConnections(workspace!.id)
      setConnectedAccounts(connections)
      
      if (connections.length === 0) {
        setSelectedEmailAccount('')
      }
      
      toast({
        title: "Success",
        description: "Gmail account removed successfully",
      })
    } catch (error) {
      console.error('Error removing Gmail connection:', error)
      toast({
        title: "Error",
        description: "Failed to remove Gmail account",
        variant: "destructive"
      })
    }
  }

  // Add useEffect to monitor auth state
  useEffect(() => {
    if (isReady && user) {
      console.log('Auth ready, user:', user.uid)
    }
  }, [isReady, user])

  const handleTestEmail = async (connectionId: string) => {
    setIsTestingEmail(connectionId)
    try {
      await gmailUtils.testEmailConnection(connectionId)
      toast({
        title: "Success",
        description: "Test email sent successfully",
      })
    } catch (error) {
      console.error('Test email failed:', error)
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive"
      })
    } finally {
      setIsTestingEmail(null)
    }
  }

  // Add useEffect to generate notification email
  useEffect(() => {
    const setupNotificationEmail = async () => {
      if (!workspace?.id || !editId) return
      
      try {
        // Try to get existing notification email
        let email = await mailgunUtils.getNotificationEmail(editId)
        
        // If none exists, generate new one
        if (!email) {
          email = await mailgunUtils.generateNotificationEmail(editId, workspace.id)
        }
        
        setNotificationEmail(mailgunUtils.getFullEmailAddress(email.emailLocalPart))
      } catch (error) {
        console.error('Error setting up notification email:', error)
        toast({
          title: "Error",
          description: "Failed to set up notification email",
          variant: "destructive"
        })
      }
    }

    setupNotificationEmail()
  }, [workspace?.id, editId, toast])

  return (
    <div className="min-h-screen w-full bg-zinc-900 flex items-center justify-center p-4">
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-30 bg-black/50" />
      )}
      
      <div className="w-full max-w-7xl bg-white rounded-xl overflow-hidden flex flex-col relative" style={{ height: 'calc(100vh - 2rem)' }}>
        {/* Header */}
        <div className="bg-gray-100 w-full shadow-sm flex-shrink-0">
          <div className="h-16 flex items-center justify-between px-6">
            <Button variant="ghost" onClick={handleGoBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>
            {isEditingName ? (
              <Input
                value={agentName}
                onChange={(e) => handleAgentNameChange(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                className={cn(
                  "max-w-[300px] text-xl font-semibold",
                  validationErrors.name && "border-red-500 focus-visible:ring-red-500"
                )}
                aria-invalid={!!validationErrors.name}
                autoFocus
              />
            ) : (
              <h1 
                className={cn(
                  "text-xl font-semibold cursor-pointer hover:opacity-80 flex items-center gap-2",
                  validationErrors.name && "text-red-500"
                )}
                onClick={() => setIsEditingName(true)}
              >
                {agentName}
                <Pencil className="h-4 w-4 text-gray-500" />
              </h1>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setIsConfigureDrawerOpen(true)}>
                <Settings className="h-4 w-4" />
                Configure
              </Button>
              <div className="flex">
                <Button 
                  className="rounded-r-none px-4 py-2 flex items-center gap-2" 
                  onClick={handleSaveAndPublish}
                >
                  <Save className="h-4 w-4" />
                  Save & Publish
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="default" 
                      className="rounded-l-none px-2 py-2 border-l border-[#646464]"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleSaveAsDraft}>
                      Save as Draft
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Configuration */}
          <div className="w-2/5 overflow-y-auto p-6 space-y-6 bg-gray-50 custom-scrollbar relative">
            {/* Email Purpose Card - Elevated above overlay */}
            <div className={cn(
              "relative",
              showOnboarding && "z-40"
            )}>
              <CollapsibleCard
                title="Email Purpose"
                isOpen={isEmailPurposeOpen}
                onToggle={() => toggleSection(setIsEmailPurposeOpen)}
                className={cn(
                  validationErrors.emailPurpose && "ring-1 ring-red-500"
                )}
              >
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="directive-select" className="text-sm font-medium">Choose Email Purpose</Label>
                    <Select onValueChange={handlePresetDirectiveChange} value={selectedDirective}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select an email purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        {presetDirectives.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ai-directive" className="text-sm font-medium">Customize AI Directive</Label>
                    <Tooltip 
                      content={validationErrors.emailPurpose} 
                      open={openTooltips.emailPurpose}
                      onOpenChange={(open) => {
                        // Only allow closing via the X button
                        if (!open) {
                          setOpenTooltips(prev => ({ ...prev, emailPurpose: false }))
                        }
                      }}
                    >
                      <Textarea
                        id="ai-directive"
                        placeholder="Customize the AI instructions for generating the email"
                        value={directive}
                        onChange={(e) => handleDirectiveChange(e.target.value)}
                        className={cn(
                          "mt-1",
                          validationErrors.emailPurpose && "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                    </Tooltip>
                    <p className="text-xs text-gray-500 mt-1">
                      Refine what the AI should do and include call-to-action.
                    </p>
                  </div>
                </div>
              </CollapsibleCard>

              {/* Onboarding Tooltip */}
              {showOnboarding && (
                <OnboardingTooltip 
                  onDismiss={() => setShowOnboarding(false)}
                  className="absolute left-1/2 -translate-x-1/2 mt-4"
                  style={{ top: 'calc(100% + 16px)' }}
                />
              )}
            </div>

            {/* Rest of the cards - Behind overlay when onboarding */}
            <div className={cn(
              "relative",
              showOnboarding && "opacity-50 pointer-events-none"
            )}>
              <CollapsibleCard
                title="Your Business Context"
                isOpen={isBusinessContextOpen}
                onToggle={() => toggleSection(setIsBusinessContextOpen)}
                className={cn(
                  validationErrors.businessPurpose && "ring-1 ring-red-500"
                )}
              >
                <div className="space-y-4">
                  <div>
                    <BusinessContext
                      website={businessInfo.website}
                      purpose={businessInfo.purpose}
                      additionalContext={businessInfo.context}
                      websiteSummary={websiteSummary}
                      onWebsiteChange={(value) => setBusinessInfo(prev => ({ ...prev, website: value }))}
                      onPurposeChange={(value) => {
                        setBusinessInfo(prev => ({ ...prev, purpose: value }))
                      }}
                      onAdditionalContextChange={(value) => setBusinessInfo(prev => ({ ...prev, context: value }))}
                      onWebsiteSummaryChange={(summary) => setWebsiteSummary(summary)}
                      agentId={editId}
                      validationError={validationErrors.businessPurpose}
                      showTooltip={openTooltips.businessPurpose}
                      onTooltipOpenChange={(open) => {
                        // Only allow closing via the X button
                        if (!open) {
                          setOpenTooltips(prev => ({ ...prev, businessPurpose: false }))
                        }
                      }}
                    />
                  </div>
                </div>
              </CollapsibleCard>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className={cn(
            "w-3/5 p-6 space-y-6 overflow-y-auto bg-white custom-scrollbar",
            showOnboarding && "opacity-50 pointer-events-none"
          )}>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Button 
                    onClick={handleTest}
                    disabled={isGenerating}
                    className="w-full py-6 text-lg font-semibold relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 mr-2" />
                      {isGenerating ? 'Generating...' : (hasTestedAgent ? 'Regenerate Email Preview' : 'Generate Email Preview')}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-75 group-hover:opacity-100 transition-opacity" />
                  </Button>
          
                  <EmailPreview {...emailDetails} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Signup Info Dialog */}
      <Dialog open={isSignupInfoDialogOpen} onOpenChange={setIsSignupInfoDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Try testing with real signup data!</DialogTitle>
            <DialogDescription>
              Enter actual user information to generate a personalized email preview. Don&apos;t worry, no emails will be sent during this test.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="signup-info" className="col-span-4">
                Signup Information
              </Label>
              <Textarea
                id="signup-info"
                value={signupInfo}
                onChange={(e) => setSignupInfo(e.target.value)}
                placeholder="Enter name, email, and any other details you collect on signup"
                className="col-span-4"
                rows={4}
              />
            </div>
          </div>
          <Button onClick={generateEmailPreview} className="w-full">
            Generate Email Preview
          </Button>
        </DialogContent>
      </Dialog>

      {/* Configuration Drawer */}
      {isConfigureDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20" onClick={() => setIsConfigureDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-lg z-50 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Configure Agent</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsConfigureDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <CollapsibleCard
                title="Connect Email Account"
                isOpen={isEmailAccountOpen}
                onToggle={() => setIsEmailAccountOpen(prev => !prev)}
              >
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect your email account to send welcome emails automatically.
                  </p>
                  
                  {isLoadingAccounts ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                      Loading accounts...
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {connectedAccounts.map(account => (
                          <div 
                            key={account.id} 
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              selectedEmailAccount === account.email && "bg-gray-50 border-gray-300"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                id={account.id}
                                name="emailAccount"
                                checked={selectedEmailAccount === account.email}
                                onChange={() => {
                                  console.log('Selecting email account:', account.email)
                                  setSelectedEmailAccount(account.email)
                                }}
                                className="h-4 w-4 text-primary border-gray-300"
                              />
                              <div className="flex flex-col">
                                <label htmlFor={account.id} className="text-sm font-medium">
                                  {account.name}
                                </label>
                                <span className="text-xs text-gray-500">
                                  {account.email}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTestEmail(account.id!)}
                                disabled={isTestingEmail === account.id}
                                className="hover:bg-blue-50 hover:text-blue-600"
                              >
                                {isTestingEmail === account.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveGmailConnection(account.id!)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {connectedAccounts.length === 0 && (
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                          <Mail className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 mb-1">
                            No email accounts connected yet
                          </p>
                          
                        </div>
                      )}
                      
                      <ConnectGmail onSuccess={handleGmailConnected} />
                    </>
                  )}
                </div>
              </CollapsibleCard>

              <CollapsibleCard
                title="Connect New Contacts"
                isOpen={isNewContactsOpen}
                onToggle={() => setIsNewContactsOpen(prev => !prev)}
              >
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    We&apos;ll provide you with a unique email address. Add this to your existing signup form as a notification email.
                    Whenever someone signs up, we&apos;ll receive their details and automatically create a personalized welcome email.
                  </p>
                  
                  {notificationEmail ? (
                    <Card className="w-full relative">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium mb-1">Your Notification Email</p>
                            <p className="text-sm text-muted-foreground break-all">{notificationEmail}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(notificationEmail)
                              toast({
                                title: "Copied!",
                                description: "Email address copied to clipboard",
                              })
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Save the agent first to get your notification email
                    </div>
                  )}
                </div>
              </CollapsibleCard>

              <CollapsibleCard
                title="Additional Settings"
                isOpen={isAdditionalSettingsOpen}
                onToggle={() => setIsAdditionalSettingsOpen(prev => !prev)}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="confident-only">Send only when AI is confident</Label>
                      <Checkbox 
                        id="confident-only" 
                        checked={settings.sendOnlyWhenConfident}
                        onCheckedChange={() => handleSettingChange('sendOnlyWhenConfident')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="review-emails">Review emails before sending</Label>
                      <Checkbox 
                        id="review-emails" 
                        checked={settings.reviewBeforeSending}
                        onCheckedChange={() => handleSettingChange('reviewBeforeSending')}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleCard>
            </div>
            <div className="p-6 bg-gray-50 border-t">
              <Button className="w-full" onClick={() => setIsConfigureDrawerOpen(false)}>
                Save Changes
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        title="You have unsaved changes"
        description="If you leave now, your changes will be lost. Are you sure you want to continue?"
        confirmText="Save & Exit"
        cancelText="Exit Without Saving"
        onConfirm={() => {
          handleSave('draft')
          pendingAction?.()
        }}
        onCancel={() => {
          setHasUnsavedChanges(false)
          pendingAction?.()
        }}
      />

      <EmailGenerationDialog 
        isOpen={!!generationStep} 
        currentStep={generationStep || 'user-info'} 
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  )
} 