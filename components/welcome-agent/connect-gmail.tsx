"use client";

import { useState, useEffect } from "react";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GmailTokens } from "@/types/gmail";

import { connectGoogle } from "@/app/actions/connect-google";
import { useAuth } from "@/hooks/use-auth";
import UpgradePlanModal from "../updgrade-plan-modal";
interface ConnectGmailProps {
  onSuccess: (email: string, name: string, tokens: GmailTokens) => Promise<void>;
}

export function ConnectGmail({ onSuccess }: ConnectGmailProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [popup, setPopup] = useState<Window | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { user } = useAuth();
  const [isUpgradePlanModalOpen, setIsUpgradePlanModalOpen] = useState(false);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "GMAIL_CONNECTED") {
        setConnectionError(null);
        await onSuccess?.(event.data.email, event.data.name, event.data.tokens);
        setIsConnecting(false);
        popup?.close();
      } else if (event.data?.type === "GMAIL_ERROR") {
        console.error("Gmail connection error:", event.data.error);
        const errorMessage =
          event.data.error || "Unable to connect Gmail account. Please try again.";
        setConnectionError(errorMessage);
        toast.error("Connection Failed", {
          description: errorMessage,
        });
        setIsConnecting(false);
        popup?.close();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, popup]);

  const handleConnect = async () => {
    if (!user) return;
    if (user.usage.connectedGmailAccounts >= user.limits.connectedGmailAccounts) {
      setIsUpgradePlanModalOpen(true);
      return;
    }
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const { success, url } = await connectGoogle();
      if (!success || !url) {
        throw new Error("Failed to get Google auth URL");
      }

      // Calculate center position for popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // Open the popup
      const newPopup = window.open(
        url,
        "Connect Gmail",
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      if (!newPopup || newPopup.closed) {
        toast.error("Popup Blocked", {
          description: "Please allow popups for this site to connect your Gmail account.",
        });
        setIsConnecting(false);
        setConnectionError("Popup was blocked. Please allow popups and try again.");
        return;
      }

      setPopup(newPopup);
      newPopup.focus();
    } catch (error) {
      console.error("Gmail connection error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to connect Gmail account. Please try again.";
      setConnectionError(errorMessage);
      toast.error("Connection Failed", {
        description: errorMessage,
      });
      setIsConnecting(false);
    }
  };

  return (
    <>
      <UpgradePlanModal
        title='Gmail connection limit reached'
        description='You have reached the maximum number of Gmail connections for your plan. Please upgrade your plan to connect more Gmail accounts.'
        isOpen={isUpgradePlanModalOpen}
        setIsOpen={setIsUpgradePlanModalOpen}
      />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              variant='outline'
              className='relative w-full'
            >
              {isConnecting ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Mail className='mr-2 h-4 w-4' />
              )}
              {isConnecting ? "Connecting Gmail..." : "Connect Gmail Account"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connect your Gmail account to send personalized welcome emails</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
