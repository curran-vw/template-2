"use client";

import { useEffect, useState, useRef } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface EmailGenerationDialogProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

const steps = {
  "user-info": "Getting user information...",
  "business-info": "Researching business details...",
  "email-body": "Crafting personalized email...",
  "subject-line": "Generating subject line...",
} as const;

const stepOrder = [
  "user-info",
  "business-info",
  "email-body",
  "subject-line",
] as const;

export function EmailGenerationDialog({
  isOpen,
  setIsOpen,
}: EmailGenerationDialogProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset states when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCurrentStepIndex(0);
        setProgress(0);

        // Clear any pending close timeout
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
      }, 500);
    }
  }, [isOpen]);

  // Increment progress based on current step
  useEffect(() => {
    if (!isOpen) return;

    const baseProgress = (currentStepIndex / stepOrder.length) * 100;
    const targetProgress = Math.min(baseProgress + 100 / stepOrder.length, 100);

    const interval = setInterval(() => {
      setProgress((prev) => {
        // If we reached target progress, move to next step
        if (prev >= targetProgress) {
          if (currentStepIndex < stepOrder.length - 1) {
            setTimeout(() => {
              setCurrentStepIndex((prevIndex) => prevIndex + 1);
            }, 500);
          } else {
            // If this is the last step and we've reached 100%, set timeout to close dialog
            closeTimeoutRef.current = setTimeout(() => {
              setIsOpen(false);
            }, 1000);
          }
          clearInterval(interval);
          return prev;
        }
        return Math.min(prev + 1, targetProgress);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStepIndex, isOpen, setIsOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className='sm:max-w-md'>
        <div className='flex flex-col items-center justify-center space-y-6 py-8'>
          <div className='space-y-2 text-center'>
            <h3 className='text-lg font-semibold'>Generating Your Email</h3>
            <p className='text-sm text-muted-foreground'>
              This could take 1-3 minutes while our AI crafts the perfect email
            </p>
          </div>

          {/* Progress Bar */}
          <div className='w-full'>
            <Progress
              value={progress}
              className='h-3'
              color='bg-gradient-to-r from-purple-500 to-pink-500'
            />
          </div>
          <div className='text-sm text-muted-foreground'>
            {Math.round(progress)}% Complete
          </div>

          <div className='w-full space-y-3'>
            {stepOrder.map((step, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div
                  key={step}
                  className={cn(
                    "flex items-center space-x-2 rounded-lg px-4 py-2 text-sm transition-colors",
                    isCurrent && "bg-primary/10 font-medium text-primary",
                    isComplete && "text-green-500",
                    !isComplete && !isCurrent && "text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      isCurrent && "bg-primary/20",
                      isComplete && "bg-green-500/20",
                      !isComplete && !isCurrent && "bg-muted",
                    )}
                  >
                    {isComplete ? (
                      <Check className='h-3 w-3' />
                    ) : (
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isCurrent
                            ? "animate-pulse bg-primary"
                            : "bg-muted-foreground/30",
                        )}
                      />
                    )}
                  </div>
                  <span>{steps[step]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
