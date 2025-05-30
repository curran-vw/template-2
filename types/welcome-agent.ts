export interface WelcomeAgent {
  id: string;
  workspaceId: string;
  name: string;
  status: "draft" | "published";
  createdAt: Date;
  updatedAt: Date;
  emailPurpose: {
    preset: string;
    directive: string;
  };
  businessContext: {
    website: string;
    purpose: string;
    additionalContext?: string;
    websiteSummary?: string;
  };
  configuration: {
    emailAccount?: string;
    notificationEmail?: string;
    settings: {
      sendOnlyWhenConfident: boolean;
      reviewBeforeSending: boolean;
    };
  };
  lastTestEmail?: {
    to: string;
    subject: string;
    body: string;
  };
  emailsSentToday?: number;
}
