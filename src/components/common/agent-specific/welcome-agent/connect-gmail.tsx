import { Button } from "@/app/components/common/button"
import { useState, useEffect } from "react"
import { Mail } from "lucide-react"
import { useToast } from "@/app/components/common/use-toast"

interface ConnectGmailProps {
  onSuccess?: (email: string, name: string, tokens: any) => void
}

export function ConnectGmail({ onSuccess }: ConnectGmailProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [popup, setPopup] = useState<Window | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message:', event.data)

      if (event.data?.type === 'GMAIL_CONNECTED') {
        console.log('Gmail connected data:', event.data)
        onSuccess?.(event.data.email, event.data.name, event.data.tokens)
        toast({
          title: "Success",
          description: "Gmail account connected successfully",
        })
        setIsConnecting(false)
        popup?.close()
      } else if (event.data?.type === 'GMAIL_ERROR') {
        console.error('Gmail connection error:', event.data.error)
        toast({
          title: "Error",
          description: event.data.error || "Failed to connect Gmail account",
          variant: "destructive"
        })
        setIsConnecting(false)
        popup?.close()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onSuccess, popup, toast])

  const handleConnect = () => {
    setIsConnecting(true)
    
    // Calculate center position for popup
    const width = 600
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    // Open the popup
    const newPopup = window.open(
      `/api/connect-google`, 
      'Connect Gmail',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    setPopup(newPopup)

    // Handle popup closed
    const checkClosed = setInterval(() => {
      if (newPopup?.closed) {
        clearInterval(checkClosed)
        setIsConnecting(false)
        setPopup(null)
      }
    }, 500)
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      variant="outline"
      className="w-full"
    >
      <Mail className="mr-2 h-4 w-4" />
      {isConnecting ? "Connecting..." : "Connect Gmail Account"}
    </Button>
  )
} 