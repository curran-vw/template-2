import { Button } from "@/app/components/common/button"
import { cn } from "@/lib/utils"

interface OnboardingTooltipProps {
  onDismiss: () => void
  className?: string
  style?: React.CSSProperties
}

export function OnboardingTooltip({ onDismiss, className, style }: OnboardingTooltipProps) {
  return (
    <div 
      className={cn(
        "absolute bg-white rounded-lg shadow-lg p-6 max-w-md text-center z-50 w-[300px]",
        "after:content-[\"\"] after:absolute after:top-0 after:left-1/2 after:-translate-x-1/2 after:-translate-y-full",
        "after:border-8 after:border-transparent after:border-b-white after:z-50",
        className
      )}
      style={style}
    >
      <h3 className="text-md font-semibold mb-2">👋 Welcome to your new agent</h3>
      <p className="text-sm mb-4">
        Choose a purpose for your email or create your own to get started.
      </p>
      <Button 
        onClick={onDismiss}
        className="w-full py-3 text-base font-semibold relative overflow-hidden group"
      >
        <span className="relative z-10 text-sm font-medium">Got it, let&apos;s go</span>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-75 group-hover:opacity-100 transition-opacity" />
      </Button>
    </div>
  )
} 