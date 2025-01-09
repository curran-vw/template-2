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
  const steps = ['user-info', 'business-info', 'email-body']
  let currentStep = 0

  const interval = setInterval(async () => {
    if (currentStep >= steps.length) {
      clearInterval(interval)
      writer.close()
      return
    }

    const data = JSON.stringify({ step: steps[currentStep] })
    await writer.write(encoder.encode(`data: ${data}\n\n`))
    currentStep++
  }, 15000) // Update every 15 seconds

  return new NextResponse(stream.readable, { headers })
} 