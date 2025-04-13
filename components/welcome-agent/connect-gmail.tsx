"use client";

import { useState, useEffect } from "react";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConnectGmailProps {
  onSuccess?: (email: string, name: string, tokens: any) => void;
  className?: string;
}

export function ConnectGmail({ onSuccess, className }: ConnectGmailProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [popup, setPopup] = useState<Window | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "GMAIL_CONNECTED") {
        onSuccess?.(event.data.email, event.data.name, event.data.tokens);
        toast.success("Gmail Connected", {
          description: `Successfully connected ${event.data.email}`,
        });
        setIsConnecting(false);
        popup?.close();
      } else if (event.data?.type === "GMAIL_ERROR") {
        console.error("Gmail connection error:", event.data.error);
        toast.error("Connection Failed", {
          description: event.data.error || "Unable to connect Gmail account. Please try again.",
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
      return;
    }

    setPopup(newPopup);

    // Handle popup closed
    const checkClosed = setInterval(() => {
      if (newPopup?.closed) {
        clearInterval(checkClosed);
        if (isConnecting) {
          toast.info("Connection Cancelled", {
            description: "Gmail connection was cancelled or timed out.",
          });
          setIsConnecting(false);
        }
        setPopup(null);
      }
    }, 500);
  };

  return (
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
  );
}
