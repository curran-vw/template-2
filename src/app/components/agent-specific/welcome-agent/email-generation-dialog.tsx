import { Dialog, DialogContent } from "@/app/components/common/dialog"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { useEffect, useState } from "react"

interface EmailGenerationDialogProps {
  isOpen: boolean
  currentStep: 'user-info' | 'business-info' | 'email-body'
}

const steps = {
  'user-info': 'Getting user information...',
  'business-info': 'Researching business details...',
  'email-body': 'Crafting personalized email...'
} as const

const stepOrder = ['user-info', 'business-info', 'email-body'] as const

export function EmailGenerationDialog({ isOpen, currentStep }: EmailGenerationDialogProps) {
  const currentStepIndex = stepOrder.indexOf(currentStep)
  const [progress, setProgress] = useState(0)

  // Reset progress when dialog opens
  useEffect(() => {
    if (isOpen) {
      setProgress(0)
    }
  }, [isOpen])

  // Increment progress based on current step
  useEffect(() => {
    if (!isOpen) return

    const baseProgress = (currentStepIndex / stepOrder.length) * 100
    const targetProgress = baseProgress + (100 / 3) // Divide progress into thirds

    // If we're at the last step and it's complete, zoom to 100%
    if (currentStepIndex >= stepOrder.length) {
      const finalInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(finalInterval)
            return 100
          }
          return Math.min(prev + 1, 100)
        })
      }, 20)
      return () => clearInterval(finalInterval)
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= targetProgress) {
          clearInterval(interval)
          return prev
        }
        return Math.min(prev + 0.5, targetProgress)
      })
    }, 100)

    return () => clearInterval(interval)
  }, [currentStepIndex, isOpen])

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">Generating Your Email</h3>
            <p className="text-sm text-muted-foreground">
              This could take 1-3 minutes while our AI crafts the perfect email
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round(progress)}% Complete
          </div>

          <div className="w-full space-y-3">
            {stepOrder.map((step, index) => {
              const isComplete = index < currentStepIndex
              const isCurrent = step === currentStep
              
              return (
                <div 
                  key={step} 
                  className={cn(
                    "flex items-center space-x-2 text-sm px-4 py-2 rounded-lg transition-colors",
                    isCurrent && "bg-purple-50 text-purple-600 font-medium",
                    isComplete && "text-green-600",
                    !isComplete && !isCurrent && "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    isCurrent && "bg-purple-100",
                    isComplete && "bg-green-100",
                    !isComplete && !isCurrent && "bg-gray-100"
                  )}>
                    {isComplete ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isCurrent ? "bg-purple-600 animate-pulse" : "bg-gray-300"
                      )} />
                    )}
                  </div>
                  <span>{steps[step]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 