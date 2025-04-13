"use client";

import type React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface OnboardingTooltipProps {
  onDismiss: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function OnboardingTooltip({
  onDismiss,
  className,
  style,
}: OnboardingTooltipProps) {
  return (
    <div
      className={cn(
        "absolute z-50 w-[300px] max-w-md rounded-lg bg-background p-6 text-center shadow-lg",
        "after:absolute after:left-1/2 after:top-0 after:z-50 after:-translate-x-1/2 after:-translate-y-full",
        "after:border-8 after:border-transparent after:border-b-background after:content-['']",
        className,
      )}
      style={style}
    >
      <h3 className='mb-2 text-md font-semibold'>
        👋 Welcome to your new agent
      </h3>
      <p className='mb-4 text-sm text-muted-foreground'>
        Choose a purpose for your email or create your own to get started.
      </p>
      <Button
        onClick={onDismiss}
        className='group relative w-full overflow-hidden py-3 text-base font-semibold'
      >
        <span className='relative z-10 text-sm font-medium'>
          Got it, let&apos;s go
        </span>
        <div className='absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-75 transition-opacity group-hover:opacity-100' />
      </Button>
    </div>
  );
}
