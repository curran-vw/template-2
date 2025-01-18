import { NextResponse } from 'next/server'
import { mailgunUtils } from '@/app/lib/firebase/mailgunUtils'
import { welcomeAgentUtils } from '@/app/lib/firebase/welcomeAgentUtils'
import { gmailUtils } from '@/app/lib/firebase/gmailUtils'

export async function POST(request: Request) {
  console.log('=== INBOUND EMAIL RECEIVED ===')
  
  try {
    const formData = await request.formData()
    
    // Get the raw email content
    const recipient = formData.get('recipient') as string
    const sender = formData.get('sender') as string
    const subject = formData.get('subject') as string
    const bodyPlain = formData.get('body-plain') as string
    const strippedText = formData.get('stripped-text') as string

    console.log('Email content:', { recipient, sender, subject, bodyPlain })

    // Find the Welcome Agent
    const localPart = recipient.split('@')[0]
    console.log('Looking up agent for:', localPart)
    
    const notificationEmail = await mailgunUtils.findByLocalPart(localPart)
    if (!notificationEmail) {
      console.error('No notification email found for:', localPart)
      return NextResponse.json({ error: 'Invalid notification email' }, { status: 404 })
    }
    
    console.log('Found notification email:', notificationEmail)

    // Get the agent configuration
    const agent = await welcomeAgentUtils.getWelcomeAgent(notificationEmail.agentId)
    if (!agent) {
      console.error('Welcome agent not found:', notificationEmail.agentId)
      return NextResponse.json({ error: 'Welcome agent not found' }, { status: 404 })
    }

    console.log('Found welcome agent:', agent)

    // Extract email from sender or body
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi
    const emailMatches = [
      ...(bodyPlain?.match(emailRegex) || []),
      ...(strippedText?.match(emailRegex) || []),
      sender
    ]
    const recipientEmail = emailMatches[0]

    if (!recipientEmail) {
      console.error('No email found in content')
      return NextResponse.json({ error: 'No email found' }, { status: 400 })
    }

    // Pass the entire email content to the AI
    const signupInfo = {
      email: recipientEmail,
      rawContent: strippedText || bodyPlain,
      subject,
      sender
    }

    console.log('Generating welcome email for signup:', signupInfo)

    // Generate and send welcome email
    const emailContent = await welcomeAgentUtils.generateWelcomeEmail(agent, signupInfo)
    console.log('Generated email content:', emailContent)
    
    if (agent.configuration?.emailAccount) {
      console.log('Sending welcome email using:', agent.configuration.emailAccount)
      await gmailUtils.sendEmail(
        agent.configuration.emailAccount,
        recipientEmail,
        emailContent.subject,
        emailContent.body
      )
      console.log('Welcome email sent successfully')
    } else {
      console.warn('No email account configured for agent:', {
        agentId: agent.id,
        configuration: agent.configuration
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing inbound email:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 