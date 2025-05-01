"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Pencil,
  Settings,
  Mail,
  Copy,
  X,
  ChevronDown,
  Trash2,
  Loader2,
  File,
} from "lucide-react";
import { toast } from "sonner";

import { useWorkspace } from "@/hooks/use-workspace";
import * as welcomeAgentUtils from "@/firebase/welcome-agent-utils";
import { useAuth } from "@/hooks/use-auth";
import { type GmailTokens } from "@/firebase/gmail-utils";
import * as gmailUtils from "@/firebase/gmail-utils";
import * as mailgunUtils from "@/firebase/mailgun-utils";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/collapsible-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { EmailPreview } from "@/components/welcome-agent/email-preview";
import { BusinessContext } from "@/components/welcome-agent/business-context";
import { EmailGenerationDialog } from "@/components/welcome-agent/email-generation-dialog";
import { ConnectGmail } from "@/components/welcome-agent/connect-gmail";
import { OnboardingTooltip } from "@/components/welcome-agent/onboarding-tooltip";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PRESET_DIRECTIVES } from "@/lib/constants";
import { type WelcomeAgent } from "@/types/welcome-agent";
import { useQuery } from "@tanstack/react-query";
import { GmailConnection } from "@/firebase/gmail-utils";
import { generateEmail } from "@/firebase/welcome-agent-utils";

export type EmailGenerationStep = "user-info" | "business-info" | "email-body" | "subject-line";

export default function WelcomeAgent({ agent }: { agent?: WelcomeAgent }) {
  const router = useRouter();
  const { workspace, agents, setAgents } = useWorkspace();
  const { user, setUser } = useAuth();
  const [signupInfo, setSignupInfo] = useState(
    "Name: Curran Van Waarde\nEmail: Curran@Agentfolio.ai\nWebsite: Agentfolio.ai\nRole: Founder",
  );
  const [directive, setDirective] = useState(agent?.emailPurpose.directive || "");
  const [selectedDirective, setSelectedDirective] = useState(agent?.emailPurpose.preset || "");
  const [agentName, setAgentName] = useState(agent?.name || "Custom Welcome Agent");
  const [isEditingName, setIsEditingName] = useState(false);
  const [emailDetails, setEmailDetails] = useState({
    to: agent?.lastTestEmail?.to || "recipient@example.com",
    subject: agent?.lastTestEmail?.subject || "Welcome Subject",
    body:
      agent?.lastTestEmail?.body || "Your personalized email will appear here after generation.",
  });
  const [hasTestedAgent, setHasTestedAgent] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    website: agent?.businessContext.website || "",
    purpose: agent?.businessContext.purpose || "",
    context: agent?.businessContext.additionalContext || "",
  });
  const [isEmailPurposeOpen, setIsEmailPurposeOpen] = useState(true);
  const [isBusinessContextOpen, setIsBusinessContextOpen] = useState(false);
  const [isSignupInfoDialogOpen, setIsSignupInfoDialogOpen] = useState(false);
  const [isConfigureDrawerOpen, setIsConfigureDrawerOpen] = useState(false);
  const [selectedEmailAccount, setSelectedEmailAccount] = useState(
    agent?.configuration.emailAccount || "",
  );
  const [notificationEmail, setNotificationEmail] = useState<string | null>(
    agent?.configuration.notificationEmail || null,
  );
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    emailPurpose?: string;
    businessPurpose?: string;
    businessWebsite?: string;
  }>({});
  const [openTooltips, setOpenTooltips] = useState<{
    name?: boolean;
    emailPurpose?: boolean;
    businessPurpose?: boolean;
    businessWebsite?: boolean;
  }>({});
  const [websiteSummary, setWebsiteSummary] = useState<string>(
    agent?.businessContext.websiteSummary || "",
  );
  const [isEmailAccountOpen, setIsEmailAccountOpen] = useState(true);
  const [isNewContactsOpen, setIsNewContactsOpen] = useState(false);
  const [isAdditionalSettingsOpen, setIsAdditionalSettingsOpen] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<GmailConnection[]>([]);

  const [isTestingEmail, setIsTestingEmail] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(!agent);
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  // Track initial values
  const [initialValues, setInitialValues] = useState({
    agentName: agent?.name || "Custom Welcome Agent",
    directive: agent?.emailPurpose.directive || "",
    selectedDirective: agent?.emailPurpose.preset || "",
    businessInfo: {
      website: agent?.businessContext.website || "",
      purpose: agent?.businessContext.purpose || "",
      context: agent?.businessContext.additionalContext || "",
    },
  });

  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isRemovingAccount, setIsRemovingAccount] = useState<string | null>(null);

  // Add new state for settings
  const [settings, setSettings] = useState({
    sendOnlyWhenConfident: agent?.configuration.settings.sendOnlyWhenConfident || false,
    reviewBeforeSending: agent?.configuration.settings.reviewBeforeSending || false,
  });

  // Check if current values are different from initial values
  const checkForChanges = useCallback(() => {
    const hasChanges =
      agentName !== initialValues.agentName ||
      directive !== initialValues.directive ||
      selectedDirective !== initialValues.selectedDirective ||
      businessInfo.website !== initialValues.businessInfo.website ||
      businessInfo.purpose !== initialValues.businessInfo.purpose ||
      businessInfo.context !== initialValues.businessInfo.context;

    setHasUnsavedChanges(hasChanges);
  }, [agentName, directive, selectedDirective, businessInfo, initialValues]);

  // Check for changes whenever relevant values change
  useEffect(() => {
    checkForChanges();
  }, [agentName, directive, selectedDirective, businessInfo, checkForChanges]);

  const { data: connectedAccountsData } = useQuery({
    queryKey: ["connectedAccounts", workspace?.id, agent?.id],
    queryFn: async () => {
      setIsLoadingAccounts(true);
      const { connections } = await gmailUtils.getGmailConnections();
      setIsLoadingAccounts(false);
      return connections;
    },
    enabled: !!workspace?.id && !!agent?.id,
  });

  useEffect(() => {
    if (connectedAccountsData) {
      setConnectedAccounts(connectedAccountsData);
      setIsLoadingAccounts(false);
    }
  }, [connectedAccountsData]);

  const handleNavigateAway = (action: () => void) => {
    if (hasUnsavedChanges) {
      setIsConfirmDialogOpen(true);
      setPendingAction(() => action);
    } else {
      action();
    }
  };

  const handleGoBack = () => {
    handleNavigateAway(() => router.back());
  };

  const toggleSection = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter((prev) => !prev);
  }, []);

  const handlePresetDirectiveChange = (value: string) => {
    setSelectedDirective(value);
    const selectedPreset = PRESET_DIRECTIVES.find((preset) => preset.value === value);
    if (selectedPreset) {
      setDirective(selectedPreset.content);
    }
  };

  const handleDirectiveChange = (value: string) => {
    setDirective(value);
  };

  const handleBusinessPurposeChange = (value: string) => {
    if (value.trim()) {
      setValidationErrors((prev) => ({ ...prev, businessPurpose: undefined }));
      setOpenTooltips((prev) => ({ ...prev, businessPurpose: false }));
    }
    setBusinessInfo((prev) => ({ ...prev, purpose: value }));
  };

  const handleAgentNameChange = (value: string) => {
    if (!value.trim()) {
      setValidationErrors((prev) => ({ ...prev, name: undefined }));
      setOpenTooltips((prev) => ({ ...prev, name: false }));
    }
    setAgentName(value);
  };

  const handleTest = () => {
    // Validate required fields
    const errors: typeof validationErrors = {};

    if (!directive.trim()) {
      errors.emailPurpose = "AI directive is required";
      setIsEmailPurposeOpen(true);
    }

    if (!businessInfo.purpose.trim()) {
      errors.businessPurpose = "Sign up purpose is required";
      setIsBusinessContextOpen(true);
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Set tooltips to true and don't automatically close them
      setOpenTooltips((prev) => ({
        ...prev,
        emailPurpose: errors.emailPurpose ? true : prev.emailPurpose,
        businessPurpose: errors.businessPurpose ? true : prev.businessPurpose,
      }));

      toast.error("Validation Error", {
        description: "Please fill in all required fields before generating email",
      });
      return;
    }

    setIsSignupInfoDialogOpen(true);
  };

  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields",
      });
    }
  }, [validationErrors]);

  const generateEmailPreview = async () => {
    setIsSignupInfoDialogOpen(false);
    setIsGenerationDialogOpen(true);
    setIsGeneratingEmail(true);

    const { success, email, error } = await generateEmail({
      senderName:
        connectedAccounts.find((account) => account.email === selectedEmailAccount)?.name ||
        "{{placeholder for Gmail account name}}",
      signupInfo,
      directive,
      businessContext: {
        website: businessInfo.website,
        purpose: businessInfo.purpose,
        websiteSummary: websiteSummary,
        additionalContext: businessInfo.context,
      },
      workspaceId: workspace?.id!,
      agentId: agent?.id,
    });

    if (error) {
      toast.error("Error", {
        description: error,
      });
    } else if (success) {
      setEmailDetails(email);
      setHasTestedAgent(true);
    }

    setIsGeneratingEmail(false);
  };

  const handleCopyEmail = () => {
    if (notificationEmail) {
      navigator.clipboard.writeText(notificationEmail);
      toast.success("Email Copied", {
        description: "The notification email has been copied to your clipboard.",
      });
    }
  };

  // Add handler for settings changes
  const handleSettingChange = (setting: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
    setHasUnsavedChanges(true);
  };

  // Update the handleSave function to include settings
  const handleSave = async (action: "published" | "draft") => {
    if (!workspace?.id || !user?.id) return;

    // Clear previous validation errors
    setValidationErrors({});

    // Only validate required fields when publishing
    if (action === "published") {
      const errors: typeof validationErrors = {};

      if (!agentName.trim()) {
        errors.name = "Agent name is required";
      }

      if (!directive.trim()) {
        errors.emailPurpose = "AI directive is required";
      }

      if (!businessInfo.purpose.trim()) {
        errors.businessPurpose = "Sign up purpose is required";
      }

      if (Object.keys(errors).length > 0) {
        // Open the collapsed sections if they contain errors
        if (errors.emailPurpose) {
          setIsEmailPurposeOpen(true);
        }
        if (errors.businessPurpose) {
          setIsBusinessContextOpen(true);
        }

        setValidationErrors(errors);
        setOpenTooltips(
          Object.keys(errors).reduce(
            (acc, key) => ({
              ...acc,
              [key]: true,
            }),
            {},
          ),
        );

        toast.error("Validation Error", {
          description: "Please fill in all required fields before publishing",
        });

        return;
      }
    }

    // Create the initial data object
    const agentData = {
      name: agentName.trim() || "Untitled Welcome Agent",
      status: action,
      emailPurpose: {
        preset: selectedDirective,
        directive: directive.trim(),
      },
      businessContext: {
        website: businessInfo.website.trim(),
        purpose: businessInfo.purpose.trim(),
        websiteSummary: websiteSummary,
        ...(businessInfo.context?.trim()
          ? {
              additionalContext: businessInfo.context.trim(),
            }
          : {}),
      },
      configuration: {
        ...(selectedEmailAccount ? { emailAccount: selectedEmailAccount } : {}),
        ...(notificationEmail ? { notificationEmail } : {}),
        settings: {
          sendOnlyWhenConfident: settings.sendOnlyWhenConfident,
          reviewBeforeSending: settings.reviewBeforeSending,
        },
      },
      ...(hasTestedAgent && emailDetails
        ? {
            lastTestEmail: {
              to: emailDetails.to,
              subject: emailDetails.subject,
              body: emailDetails.body,
            },
          }
        : {}),
    };

    // Remove any undefined or null values recursively
    const cleanData = (obj: any): any => {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v != null)
          .map(([k, v]) => [k, v && typeof v === "object" ? cleanData(v) : v]),
      );
    };

    const cleanedAgentData = cleanData(agentData);

    if (agent?.id) {
      // Update existing agent
      const {
        success,
        agent: updatedAgent,
        error,
      } = await welcomeAgentUtils.updateWelcomeAgent({
        agentId: agent.id,
        updates: cleanedAgentData,
      });
      if (success) {
        toast.success("Success", {
          description: success,
        });
        setAgents(agents.map((a) => (a.id === agent.id ? updatedAgent : a)));
        router.push("/agents");
        router.refresh();
      } else {
        toast.error("Error", { description: error });
      }
    } else {
      // Create new agent
      const { success, agent, error } = await welcomeAgentUtils.createWelcomeAgent({
        workspaceId: workspace.id,
        agent: cleanedAgentData,
      });
      if (success) {
        toast.success("Success", {
          description: success,
        });
        setAgents([...agents, agent]);
        setUser({ ...user, usage: { ...user.usage, agents: user.usage.agents + 1 } });
        router.push("/agents");
        router.refresh();
      } else {
        toast.error("Error", { description: error });
      }
    }
  };

  // Update the save handlers for the buttons
  const handleSaveAndPublish = async () => {
    setIsPublishing(true);
    await handleSave("published");
    setIsPublishing(false);
  };

  const handleSaveAsDraft = async () => {
    setIsSaving(true);
    await handleSave("draft");
    setIsSaving(false);
  };

  const handleGmailConnected = async (email: string, name: string, tokens: GmailTokens) => {
    if (!workspace?.id || !user?.id || !agent?.id) return;

    const { success, error, connection } = await gmailUtils.saveGmailConnection({
      email,
      name,
      tokens,
    });

    if (success) {
      setConnectedAccounts((prev) => [...prev, connection]);
      setSelectedEmailAccount(email);
      toast.success("Success", {
        description: success,
      });
      setUser({
        ...user,
        usage: { ...user.usage, connectedGmailAccounts: user.usage.connectedGmailAccounts + 1 },
      });
    } else {
      toast.error("Error", {
        description: error,
      });
    }
  };

  const handleRemoveGmailConnection = async (connectionId: string, email: string) => {
    if (!user) return;
    setIsRemovingAccount(connectionId);
    const { success, error } = await gmailUtils.removeConnection({
      connectionId,
    });

    if (success) {
      const {
        connections,
        success: connectionsSuccess,
        error: connectionsError,
      } = await gmailUtils.getGmailConnections();

      if (connectionsSuccess) {
        setConnectedAccounts(connections);
        if (selectedEmailAccount === email) {
          setSelectedEmailAccount("");
        }
        setUser({
          ...user,
          usage: { ...user.usage, connectedGmailAccounts: user.usage.connectedGmailAccounts - 1 },
        });
      } else {
        toast.error("Error", {
          description: connectionsError,
        });
      }
    } else {
      toast.error("Error", {
        description: error,
      });
    }
    setIsRemovingAccount(null);
  };

  const handleTestEmail = async (connectionId: string) => {
    if (!workspace?.id) {
      toast.error("Error", {
        description: "No workspace selected",
      });
      return;
    }

    setIsTestingEmail(connectionId);
    const { success, error } = await gmailUtils.testEmailConnection({
      connectionId,
    });

    if (success) {
      toast.success("Success", {
        description: "Test email sent successfully",
      });
    } else {
      toast.error("Error", {
        description: error,
      });
    }
    setIsTestingEmail(null);
  };

  const [loadingNotificationEmail, setLoadingNotificationEmail] = useState(false);
  const { data: notificationEmailData } = useQuery({
    queryKey: ["notificationEmail", workspace?.id, agent?.id],
    queryFn: async () => {
      setLoadingNotificationEmail(true);
      if (!workspace?.id || !agent?.id) return null;
      const { notificationEmail } = await mailgunUtils.getNotificationEmail({
        agentId: agent.id,
        workspaceId: workspace.id,
      });
      setLoadingNotificationEmail(false);
      return notificationEmail;
    },
    enabled: !!workspace?.id && !!agent?.id,
  });

  // Set notification email when data is available
  useEffect(() => {
    if (notificationEmailData) {
      setNotificationEmail(getFullEmailAddress(notificationEmailData.emailLocalPart));
      setLoadingNotificationEmail(false);
    }
  }, [notificationEmailData]);

  return (
    <TooltipProvider>
      <div className='flex min-h-screen w-full items-center justify-center bg-zinc-900 p-4'>
        {/* Onboarding Overlay */}
        {showOnboarding && <div className='fixed inset-0 z-30 bg-black/50' />}

        <div
          className='relative flex w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-background'
          style={{ height: "calc(100vh - 2rem)" }}
        >
          {/* Header */}
          <div className='flex-shrink-0 border-b bg-muted/40'>
            <div className='flex h-16 items-center justify-between px-6'>
              <Button variant='ghost' onClick={handleGoBack} className='gap-2'>
                <ArrowLeft className='h-4 w-4' />
                Go back
              </Button>
              {isEditingName ? (
                <Input
                  value={agentName}
                  onChange={(e) => handleAgentNameChange(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                  className={cn(
                    "max-w-[300px] text-xl font-semibold",
                    validationErrors.name && "border-destructive ring-destructive",
                  )}
                  aria-invalid={!!validationErrors.name}
                  autoFocus
                />
              ) : (
                <h1
                  className={cn(
                    "flex cursor-pointer items-center gap-2 text-xl font-semibold hover:opacity-80",
                    validationErrors.name && "text-destructive",
                  )}
                  onClick={() => setIsEditingName(true)}
                >
                  {agentName}
                  <Pencil className='h-4 w-4 text-muted-foreground' />
                </h1>
              )}
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  className='gap-2'
                  onClick={() => setIsConfigureDrawerOpen(true)}
                >
                  <Settings className='h-4 w-4' />
                  Configure
                </Button>
                <div className='flex'>
                  <Button
                    className='flex items-center gap-2 rounded-r-none px-4 py-2'
                    onClick={handleSaveAndPublish}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <LoadingSpinner className='h-4 w-4' />
                    ) : (
                      <Save className='h-4 w-4' />
                    )}
                    Save & Publish
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='default'
                        className='rounded-l-none border-l border-primary-foreground/20 px-2 py-2'
                      >
                        <ChevronDown className='h-4 w-4' />
                        <span className='sr-only'>More save options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          handleSaveAsDraft();
                        }}
                      >
                        {isSaving ? <LoadingSpinner className='h-4 w-4' /> : <File />}
                        <span>Save as Draft</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className='flex flex-1 overflow-hidden'>
            {/* Left Column - Configuration */}
            <div className='custom-scrollbar relative w-2/5 space-y-6 overflow-y-auto bg-muted/30 p-6'>
              {/* Email Purpose Card - Elevated above overlay */}
              <div className={cn("relative", showOnboarding && "z-40")}>
                <CollapsibleCard
                  title='Email Purpose'
                  isOpen={isEmailPurposeOpen}
                  onToggle={() => toggleSection(setIsEmailPurposeOpen)}
                  className={cn(validationErrors.emailPurpose && "ring-1 ring-destructive")}
                >
                  <div className='space-y-4'>
                    <div>
                      <Label htmlFor='directive-select' className='text-sm font-medium'>
                        Choose Email Purpose
                      </Label>
                      <Select onValueChange={handlePresetDirectiveChange} value={selectedDirective}>
                        <SelectTrigger className='mt-1' id='directive-select'>
                          <SelectValue placeholder='Select an email purpose' />
                        </SelectTrigger>
                        <SelectContent>
                          {PRESET_DIRECTIVES.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor='ai-directive' className='text-sm font-medium'>
                        Customize AI Directive
                      </Label>
                      <Tooltip open={openTooltips.emailPurpose}>
                        <TooltipTrigger asChild>
                          <Textarea
                            id='ai-directive'
                            placeholder='Customize the AI instructions for generating the email'
                            value={directive}
                            onChange={(e) => handleDirectiveChange(e.target.value)}
                            className={cn(
                              "mt-1",
                              validationErrors.emailPurpose &&
                                "border-destructive focus-visible:ring-destructive",
                            )}
                          />
                        </TooltipTrigger>
                        {validationErrors.emailPurpose && (
                          <TooltipContent>{validationErrors.emailPurpose}</TooltipContent>
                        )}
                      </Tooltip>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        Refine what the AI should do and include call-to-action.
                      </p>
                    </div>
                  </div>
                </CollapsibleCard>

                {/* Onboarding Tooltip */}
                {showOnboarding && (
                  <OnboardingTooltip
                    onDismiss={() => setShowOnboarding(false)}
                    className='absolute left-1/2 mt-4 -translate-x-1/2'
                    style={{ top: "calc(100% + 16px)" }}
                  />
                )}
              </div>

              {/* Rest of the cards - Behind overlay when onboarding */}
              <div className={cn("relative", showOnboarding && "pointer-events-none opacity-50")}>
                <CollapsibleCard
                  title='Your Business Context'
                  isOpen={isBusinessContextOpen}
                  onToggle={() => toggleSection(setIsBusinessContextOpen)}
                  className={cn(validationErrors.businessPurpose && "ring-1 ring-destructive")}
                >
                  <div className='space-y-4'>
                    <div>
                      <BusinessContext
                        website={businessInfo.website}
                        purpose={businessInfo.purpose}
                        additionalContext={businessInfo.context}
                        websiteSummary={websiteSummary}
                        onWebsiteChange={(value) =>
                          setBusinessInfo((prev) => ({
                            ...prev,
                            website: value,
                          }))
                        }
                        onPurposeChange={(value) => {
                          setBusinessInfo((prev) => ({
                            ...prev,
                            purpose: value,
                          }));
                        }}
                        onAdditionalContextChange={(value) =>
                          setBusinessInfo((prev) => ({
                            ...prev,
                            context: value,
                          }))
                        }
                        onWebsiteSummaryChange={(summary) => setWebsiteSummary(summary)}
                        agentId={agent?.id}
                        validationError={validationErrors.businessPurpose}
                        showTooltip={openTooltips.businessPurpose}
                        onTooltipOpenChange={(open) => {
                          // Only allow closing via the X button
                          if (!open) {
                            setOpenTooltips((prev) => ({
                              ...prev,
                              businessPurpose: false,
                            }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </CollapsibleCard>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div
              className={cn(
                "custom-scrollbar w-3/5 space-y-6 overflow-y-auto bg-background p-6",
                showOnboarding && "pointer-events-none opacity-50",
              )}
            >
              <Card className='shadow-sm'>
                <CardHeader>
                  <CardTitle>Email Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-6'>
                    <Button
                      onClick={handleTest}
                      disabled={isGeneratingEmail}
                      className='group relative w-full overflow-hidden py-6 text-lg font-semibold'
                    >
                      <span className='relative z-10 flex items-center justify-center'>
                        <Sparkles className='mr-2 h-5 w-5' />
                        {isGeneratingEmail
                          ? "Generating..."
                          : hasTestedAgent
                          ? "Regenerate Email Preview"
                          : "Generate Email Preview"}
                      </span>
                      <div className='absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-75 transition-opacity group-hover:opacity-100' />
                    </Button>

                    <EmailPreview {...emailDetails} loading={isGeneratingEmail} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Signup Info Dialog */}
        <Dialog open={isSignupInfoDialogOpen} onOpenChange={setIsSignupInfoDialogOpen}>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>Try testing with real signup data!</DialogTitle>
              <DialogDescription>
                Enter actual user information to generate a personalized email preview. Don&apos;t
                worry, no emails will be sent during this test.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='signup-info' className='col-span-4'>
                  Signup Information
                </Label>
                <Textarea
                  id='signup-info'
                  value={signupInfo}
                  onChange={(e) => setSignupInfo(e.target.value)}
                  placeholder='Enter name, email, and any other details you collect on signup'
                  className='col-span-4'
                  rows={4}
                />
              </div>
            </div>
            <Button onClick={generateEmailPreview} className='w-full'>
              Generate Email Preview
            </Button>
          </DialogContent>
        </Dialog>

        {/* Configuration Drawer */}
        {isConfigureDrawerOpen && (
          <>
            <div
              className='fixed inset-0 bg-black/20'
              onClick={() => setIsConfigureDrawerOpen(false)}
            />
            <div className='fixed right-0 top-0 z-50 flex h-full w-[450px] flex-col bg-background shadow-lg'>
              <div className='flex items-center justify-between border-b p-6'>
                <h2 className='text-lg font-semibold'>Configure Agent</h2>
                <Button variant='ghost' size='icon' onClick={() => setIsConfigureDrawerOpen(false)}>
                  <X className='h-4 w-4' />
                  <span className='sr-only'>Close</span>
                </Button>
              </div>
              <div className='flex-1 space-y-4 overflow-y-auto p-6'>
                <CollapsibleCard
                  title='Connect Email Account'
                  isOpen={isEmailAccountOpen}
                  onToggle={() => setIsEmailAccountOpen((prev) => !prev)}
                >
                  <div className='space-y-4'>
                    <p className='text-sm text-muted-foreground'>
                      Connect your email account to send welcome emails automatically.
                    </p>

                    {isLoadingAccounts ? (
                      <div className='py-4 text-center text-sm text-muted-foreground'>
                        <Loader2 className='mx-auto mb-2 h-4 w-4 animate-spin' />
                        Loading accounts...
                      </div>
                    ) : (
                      <>
                        <div className='space-y-2'>
                          {connectedAccounts.map((account) => (
                            <div
                              key={account.id}
                              className={cn(
                                "flex items-center justify-between rounded-lg border p-3",
                                account.email === selectedEmailAccount &&
                                  "border-primary/50 bg-muted",
                              )}
                            >
                              <div className='min-w-0 flex-1 flex items-center gap-3'>
                                <input
                                  type='radio'
                                  id={account.id}
                                  name='emailAccount'
                                  checked={account.email === selectedEmailAccount}
                                  onChange={async () => {
                                    setSelectedEmailAccount(account.email);
                                  }}
                                  className='h-4 w-4 border-muted-foreground text-primary'
                                />

                                <label
                                  htmlFor={account.id}
                                  className='cursor-pointer min-w-0 flex flex-1 flex-col'
                                >
                                  <span className='whitespace-nowrap overflow-hidden text-ellipsis text-sm font-medium'>
                                    {account.name}
                                  </span>
                                  <span className='whitespace-nowrap overflow-hidden text-ellipsis text-xs text-muted-foreground'>
                                    {account.email}
                                  </span>
                                </label>
                              </div>
                              <div className='flex items-center gap-2'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleTestEmail(account.id!)}
                                  disabled={isTestingEmail === account.id}
                                  className='text-primary hover:bg-primary/10 hover:text-primary'
                                >
                                  {isTestingEmail === account.id ? (
                                    <LoadingSpinner />
                                  ) : (
                                    <Mail className='h-4 w-4' />
                                  )}
                                  <span className='sr-only'>Test email</span>
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() =>
                                    handleRemoveGmailConnection(account.id!, account.email)
                                  }
                                  className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                                >
                                  {isRemovingAccount === account.id ? (
                                    <LoadingSpinner />
                                  ) : (
                                    <Trash2 className='h-4 w-4' />
                                  )}
                                  <span className='sr-only'>Remove account</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {connectedAccounts.length === 0 && (
                          <div className='rounded-lg border-2 border-dashed border-muted p-6 text-center'>
                            <Mail className='mx-auto mb-3 h-8 w-8 text-muted-foreground' />
                            <p className='mb-1 text-sm text-muted-foreground'>
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
                  title='Connect New Contacts'
                  isOpen={isNewContactsOpen}
                  onToggle={() => setIsNewContactsOpen((prev) => !prev)}
                >
                  <div className='space-y-4'>
                    <p className='text-sm text-muted-foreground'>
                      We&apos;ll provide you with a unique email address. Add this to your existing
                      signup form as a notification email. Whenever someone signs up, we&apos;ll
                      receive their details and automatically create a personalized welcome email.
                    </p>

                    {loadingNotificationEmail ? (
                      <div className='py-4 text-center text-sm text-muted-foreground'>
                        <Loader2 className='mx-auto mb-2 h-4 w-4 animate-spin' />
                        Loading notification email...
                      </div>
                    ) : notificationEmail ? (
                      <Card className='relative w-full'>
                        <CardContent className='p-4'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <p className='mb-1 text-sm font-medium'>Your Notification Email</p>
                              <p className='break-all text-sm text-muted-foreground'>
                                {notificationEmail}
                              </p>
                            </div>
                            <Button variant='outline' size='icon' onClick={handleCopyEmail}>
                              <Copy className='h-4 w-4' />
                              <span className='sr-only'>Copy email</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className='py-2 text-center text-sm text-muted-foreground'>
                        Save the agent first to get your notification email
                      </div>
                    )}
                  </div>
                </CollapsibleCard>

                <CollapsibleCard
                  title='Additional Settings'
                  isOpen={isAdditionalSettingsOpen}
                  onToggle={() => setIsAdditionalSettingsOpen((prev) => !prev)}
                >
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <Label htmlFor='confident-only' className='flex-1'>
                          Send only when AI is confident
                        </Label>
                        <Checkbox
                          id='confident-only'
                          checked={settings.sendOnlyWhenConfident}
                          onCheckedChange={() => handleSettingChange("sendOnlyWhenConfident")}
                        />
                      </div>
                      <div className='flex items-center justify-between'>
                        <Label htmlFor='review-emails' className='flex-1'>
                          Review emails before sending
                        </Label>
                        <Checkbox
                          id='review-emails'
                          checked={settings.reviewBeforeSending}
                          onCheckedChange={() => handleSettingChange("reviewBeforeSending")}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleCard>

                <div className='flex gap-2 justify-end'>
                  <Button
                    className='flex items-center gap-2 px-4 py-2'
                    onClick={handleSaveAsDraft}
                    disabled={isSaving}
                    variant='outline'
                  >
                    {isSaving ? (
                      <LoadingSpinner className='h-4 w-4' />
                    ) : (
                      <File className='h-4 w-4' />
                    )}
                    Save as Draft
                  </Button>
                  <Button
                    className='flex items-center gap-2 px-4 py-2'
                    onClick={handleSaveAndPublish}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <LoadingSpinner className='h-4 w-4' />
                    ) : (
                      <Save className='h-4 w-4' />
                    )}
                    Save & Publish
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        <ConfirmDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          title='You have unsaved changes'
          description='If you leave now, your changes will be lost. Are you sure you want to continue?'
          confirmText='Save & Exit'
          cancelText='Exit Without Saving'
          onConfirm={async () => {
            setIsSaving(true);
            await handleSave("draft");
            setIsSaving(false);
            setIsConfirmDialogOpen(false);
            pendingAction?.();
          }}
          onCancel={() => {
            setHasUnsavedChanges(false);
            pendingAction?.();
          }}
          loading={isSaving}
        />

        <EmailGenerationDialog
          isOpen={isGenerationDialogOpen}
          setIsOpen={setIsGenerationDialogOpen}
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
    </TooltipProvider>
  );
}

function getFullEmailAddress(localPart: string): string {
  return `${localPart}@notifications.agentfolio.ai`;
}
