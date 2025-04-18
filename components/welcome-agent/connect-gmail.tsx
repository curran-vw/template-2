"use client";

import { useState, useEffect } from "react";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GmailTokens } from "@/types/gmail";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateTokens } from "@/server/gmail";

interface ConnectGmailProps {
  onSuccess?: (email: string, name: string, tokens: GmailTokens) => void;
  className?: string;
}

export function ConnectGmail({ onSuccess, className }: ConnectGmailProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [popup, setPopup] = useState<Window | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "GMAIL_CONNECTED") {
        try {
          // Validate the tokens before proceeding
          const isValid = await validateTokens(event.data.tokens);
          if (!isValid) {
            throw new Error("Invalid Gmail tokens received");
          }

          setConnectionError(null);
          onSuccess?.(event.data.email, event.data.name, event.data.tokens);
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
        } finally {
          setIsConnecting(false);
          popup?.close();
        }
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

  const handleConnect = () => {
    setIsConnecting(true);
    setConnectionError(null);
    setConnectionAttempts((prev) => prev + 1);

    // Calculate center position for popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Open the popup
    const newPopup = window.open(
      `/api/connect-google`,
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

    // // Handle popup closed
    // const checkClosed = setInterval(() => {
    //   if (newPopup?.closed) {
    //     clearInterval(checkClosed);
    //     if (isConnecting) {
    //       const message = "Gmail connection was cancelled or timed out.";
    //       setConnectionError(message);
    //       toast.info("Connection Cancelled", {
    //         description: message,
    //       });
    //       setIsConnecting(false);
    //     }
    //     setPopup(null);
    //   }
    // }, 500);

    // Set a timeout to handle cases where the popup might be open but not responding
    // const connectionTimeout = setTimeout(() => {
    //   if (isConnecting) {
    //     const message = "Connection timed out. Please try again.";
    //     setConnectionError(message);
    //     toast.error("Connection Timeout", {
    //       description: message,
    //     });
    //     setIsConnecting(false);
    //     newPopup?.close();
    //     setPopup(null);
    //   }
    // }, 120000); // 2 minutes timeout

    // Clear the timeout when component unmounts or connection completes
    // return () => clearTimeout(connectionTimeout);
  };

  return (
    <>
      {connectionError && (
        <Alert variant='destructive' className='mb-4'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{connectionError}</AlertDescription>
        </Alert>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              variant='outline'
              className={`relative ${className || "w-full"}`}
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
