import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const encoder = new TextEncoder()

  // Send updates for each step
  const steps = ['user-info', 'business-info', 'email-body', 'subject-line']
  let currentStep = 0

  // Handle client disconnection
  const cleanup = () => {
    clearInterval(interval)
    
    // Handle writer errors gracefully
    writer.close().catch((err: any) => {
      console.log('Writer close error (expected on client disconnect):', err.message)
    })
  }

  // Create the interval to send updates
  const interval = setInterval(async () => {
    if (currentStep >= steps.length) {
      cleanup()
      return
    }

    try {
      const data = JSON.stringify({ step: steps[currentStep] })
      await writer.write(encoder.encode(`data: ${data}\n\n`))
      currentStep++
    } catch (err: any) {
      console.log('Write error (likely client disconnected):', err.message)
      cleanup()
    }
  }, 5000) // Update every 5 seconds (reduced from 15s for better feedback)

  // Set an overall timeout to ensure cleanup happens
  setTimeout(cleanup, 60000) // Max 1 minute

  return new NextResponse(stream.readable, { headers })
} 