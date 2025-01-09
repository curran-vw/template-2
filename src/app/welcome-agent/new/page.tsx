'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from "@/app/components/common/button"
import { Input } from "@/app/components/common/input"
import { Label } from "@/app/components/common/label"
import { Textarea } from "@/app/components/common/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/common/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/common/card"
import { ArrowLeft, Save, Sparkles, Pencil, Check, Settings, Mail, Play, Copy, X, ChevronDown } from 'lucide-react'
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

const presetDirectives = [
  { value: "industry-expert", label: "Position yourself as an industry expert", content: "Position yourself as an industry expert, sharing specific insights about challenges their competitors are facing." },
  { value: "simple-custom-welcome", label: "Simple customized welcome email", content: "Send a simple customized welcome email that shows you looked up their business, how they're a perfect fit, and benefits they'll get specifically based on their business." },
  { value: "success-story", label: "Share a success story", content: "Write an email that includes a success story from a similar company in the recipient's industry." },
  { value: "book-call", label: "Suggest a quick call", content: "Suggest a quick call to discuss how we've helped similar companies in the recipient's industry." },
  { value: "product-demo", label: "Invite to product demo", content: "Invite the recipient to see a personalized demo of our solution, highlighting specific features that would benefit their role." },
  { value: "custom-upsell", label: "Upsell based on an ROI benefit", content: "Introduce premium features relevant to the recipient's industry, focusing on ROI and specific benefits for their role." },
  { value: "fully-custom", label: "Custom", content: " " },
]

export default function WelcomeAgentNew() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const shouldOpenConfigure = searchParams.get('configure') === 'true'
  const { workspace } = useWorkspace()
  const { toast } = useToast()
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

  // Track initial values
  const [initialValues, setInitialValues] = useState({
    agentName: "Custom Welcome Agent",
    directive: "",
    selectedDirective: "",
    businessInfo: { website: '', purpose: '', context: '' }
  })

  const { generateEmail, isGenerating } = useEmailGenerator()

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
  }, [editId])

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
    }
  }, [shouldOpenConfigure])

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
    if (value.trim()) {
      setValidationErrors(prev => ({ ...prev, emailPurpose: undefined }))
      setOpenTooltips(prev => ({ ...prev, emailPurpose: false }))
    }
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
    }

    if (!businessInfo.purpose.trim()) {
      errors.businessPurpose = "Sign up purpose is required"
    }

    if (!businessInfo.website.trim() && !isCrawled) {
      errors.businessWebsite = "Please attempt to crawl your website"
    }

    if (Object.keys(errors).length > 0) {
      // Open the collapsed sections if they contain errors
      if (errors.emailPurpose) {
        setIsEmailPurposeOpen(true)
      }
      if (errors.businessPurpose || errors.businessWebsite) {
        setIsBusinessContextOpen(true)
      }

      setValidationErrors(errors)
      setOpenTooltips(
        Object.keys(errors).reduce((acc, key) => ({
          ...acc,
          [key]: true
        }), {})
      )

      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before generating email",
        variant: "destructive"
      })
      return
    }

    setIsSignupInfoDialogOpen(true)
  }

  const generateEmailPreview = async () => {
    setIsSignupInfoDialogOpen(false)

    const email = await generateEmail({
      signupInfo,
      directive,
      businessContext: {
        website: businessInfo.website,
        purpose: businessInfo.purpose,
        websiteSummary,
        additionalContext: businessInfo.context
      },
      agentId: editId
    })

    if (email) {
      setEmailDetails(email)
      setHasTestedAgent(true)
    }
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

  const handleSave = async (action: 'publish' | 'draft') => {
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
    if (action === 'publish') {
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
            sendOnlyWhenConfident: false,
            reviewBeforeSending: false
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
        description: `Welcome agent ${action === 'publish' ? 'published' : 'saved as draft'}`,
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
    handleSave('publish')
  }
  
  const handleSaveAsDraft = () => {
    console.log('Attempting to save as draft...')
    handleSave('draft')
  }

  return (
    <div className="min-h-screen w-full bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl bg-white rounded-xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>
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
          <div className="w-2/5 overflow-y-auto p-6 space-y-6 bg-gray-50 custom-scrollbar">
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
                    onOpenChange={(open) => setOpenTooltips(prev => ({ ...prev, emailPurpose: open }))}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Refine the AI's approach to writing the welcome email.
                  </p>
                </div>
              </div>
            </CollapsibleCard>

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
                    onPurposeChange={(value) => setBusinessInfo(prev => ({ ...prev, purpose: value }))}
                    onAdditionalContextChange={(value) => setBusinessInfo(prev => ({ ...prev, context: value }))}
                    onWebsiteSummaryChange={(summary) => setWebsiteSummary(summary)}
                    agentId={editId}
                  />
                </div>
              </div>
            </CollapsibleCard>
          </div>

          {/* Right Column - Preview */}
          <div className="w-3/5 p-6 space-y-6 overflow-y-auto bg-white custom-scrollbar">
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
              Enter actual user information to generate a personalized email preview. Don't worry, no emails will be sent during this test.
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
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setIsConfigureDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-lg z-50 overflow-y-auto transition-transform duration-300 ease-in-out transform translate-x-0">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Configure Welcome Agent</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsConfigureDrawerOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Set up your email account, contact integration, and additional settings.
              </p>
              <Separator />
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Connect Email Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Select or add the email account to send welcome emails from.
                  </p>
                  <RadioGroup value={selectedEmailAccount} onValueChange={setSelectedEmailAccount}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="john@example.com" id="john@example.com" />
                      <Label htmlFor="john@example.com">john@example.com</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="jane@example.com" id="jane@example.com" />
                      <Label htmlFor="jane@example.com">jane@example.com</Label>
                    </div>
                  </RadioGroup>
                  <Button variant="outline" className="mt-2">
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      <path d="M1 1h22v22H1z" fill="none"/>
                    </svg>
                    Add New Google Account
                  </Button>
                </div>
                <Separator />
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Connect New Contacts</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up an email notification for new signups to create personalized welcome emails.
                  </p>
                  <Card className="w-full relative">
                    <Badge className="absolute top-4 right-4 px-2 py-1">EASY SETUP</Badge>
                    <CardContent className="pt-6 px-4 sm:px-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <Mail className="w-12 h-12 text-primary" />
                        <h3 className="text-lg font-semibold">Add Our Email to Your Signup Form</h3>
                        <p className="text-sm text-muted-foreground">
                          We'll provide you with a unique email address. Add this to your existing signup form as a notification email. 
                          Whenever someone signs up, we'll receive their details and automatically create a personalized welcome email.
                        </p>
                        <div className="flex justify-center space-x-4 w-full">
                          {notificationEmail ? (
                            <div className="flex items-center justify-center space-x-2">
                              <input 
                                type="text" 
                                value={notificationEmail} 
                                readOnly 
                                className="px-3 py-2 border rounded-md w-64"
                              />
                              <Button variant="outline" onClick={handleCopyEmail}>
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          ) : (
                            <Button onClick={handleGetEmail} className="w-48">Get Email Address</Button>
                          )}
                          <Button variant="outline" className="flex items-center w-48">
                            <Play className="w-4 h-4 mr-2" />
                            See How It Works
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="confident-only">Send only when AI is confident</Label>
                      <Checkbox id="confident-only" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="review-emails">Review emails before sending</Label>
                      <Checkbox id="review-emails" />
                    </div>
                  </div>
                </div>
              </div>
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