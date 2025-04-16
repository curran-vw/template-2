import { useState } from "react";
import { useWorkspace } from "./use-workspace";
import { toast } from "sonner";

interface EmailGeneratorProps {
  signupInfo: string;
  directive: string;
  businessContext: {
    website: string;
    purpose: string;
    websiteSummary?: string;
    additionalContext?: string;
  };
  agentId?: string;
  onStepChange?: (step: "user-info" | "business-info" | "email-body" | "subject-line") => void;
}

export function useEmailGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { workspace } = useWorkspace();

  const generateEmail = async ({
    signupInfo,
    directive,
    businessContext,
    agentId,
  }: EmailGeneratorProps) => {
    setIsGenerating(true);

    try {
      // Validate required fields
      if (!signupInfo) {
        throw new Error("Signup info is required");
      }

      if (!businessContext || !businessContext.purpose) {
        throw new Error("Business purpose is required");
      }

      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signupInfo,
          directive,
          businessContext,
          workspaceId: workspace?.id,
          agentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.details || errorData.error || "Failed to generate email");
      }

      const data = await response.json();
      return data.email;
    } catch (error) {
      console.error("Email generation error:", error);
      toast.error("Email Generation Error", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate email. Please try again later.",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateEmail,
    isGenerating,
  };
}
