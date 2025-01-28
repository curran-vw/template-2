import { NextResponse } from 'next/server'
import { logsUtils } from '@/app/lib/firebase/logsUtils'

export async function POST(req: Request) {
  try {
    const { signupInfo, directive, businessContext, workspaceId, agentId } = await req.json()

    // Log the start of the process
    await logsUtils.addLog({
      type: 'api',
      status: 'pending',
      details: 'Starting email generation process',
      workspaceId,
      agentId
    })

    // Run first two prompts in parallel
    const [userInfo, businessInfo] = await Promise.all([
      // User Info Prompt
      (async () => {
        await logsUtils.addLog({
          type: 'api',
          status: 'pending',
          details: 'Getting user information',
          workspaceId,
          agentId
        })

        const userInfoResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://agentfolio.ai',
            'X-Title': 'Agentfolio'
          },
          body: JSON.stringify({
            model: 'perplexity/llama-3.1-sonar-huge-128k-online',
            messages: [{
              role: 'user',
              content: `Do a search for this user. Here's the sign up email we got with their info: ${signupInfo}. 
              Make sure to only look at the user's info. 
              Come back with only info about who they are, what business they work for, etc. 
              Include contact information if you can find it. 
              Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
              For extra context, they signed up for: ${businessContext.purpose}`
            }]
          })
        })

        if (!userInfoResponse.ok) throw new Error('Failed to get user info')
        const data = await userInfoResponse.json()
        const info = data.choices[0].message.content

        await logsUtils.addLog({
          type: 'api',
          status: 'success',
          details: 'Successfully retrieved user information',
          response: info,
          workspaceId,
          agentId
        })

        return info
      })(),

      // Business Info Prompt
      (async () => {
        await logsUtils.addLog({
          type: 'api',
          status: 'pending',
          details: 'Getting business information',
          workspaceId,
          agentId
        })

        const businessInfoResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://agentfolio.ai',
            'X-Title': 'Agentfolio'
          },
          body: JSON.stringify({
            model: 'perplexity/llama-3.1-sonar-huge-128k-online',
            messages: [{
              role: 'user',
              content: `Do a search for the business associated with this signup: ${signupInfo}... 
              -- Come back with only info about who they are, what business they do, industry, etc. 
              Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
              For extra context, they signed up for ${businessContext.purpose}`
            }]
          })
        })

        if (!businessInfoResponse.ok) throw new Error('Failed to get business info')
        const data = await businessInfoResponse.json()
        const info = data.choices[0].message.content

        await logsUtils.addLog({
          type: 'api',
          status: 'success',
          details: 'Successfully retrieved business information',
          response: info,
          workspaceId,
          agentId
        })

        return info
      })()
    ])

    // Now run email body and subject generation in parallel
    const [emailBody, subject] = await Promise.all([
      // Generate Email Body
      (async () => {
        await logsUtils.addLog({
          type: 'api',
          status: 'pending',
          details: 'Generating email body',
          workspaceId,
          agentId
        })

        const emailBodyResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://agentfolio.ai',
            'X-Title': 'Agentfolio'
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [{
              role: 'user',
              content: `We are writing the body of a personalized email today to a new lead that just signed up 
              (keep it max of 2-3 paragraphs and MAX 1-2 sentences per paragraph). 
              Do not include the subject line. 
              Make it read like a human sent it after looking up their company and make it clear we know what they do without jargon.  
              Make it pretty casual and welcoming with an 8th grade reading level. 
              If there's no specific info at all about the signup, just make it generic 
              (and don't make a note that it is a template). 
              Address the person by first name if available (but just make it general if no name is provided). 
              Sign off from the name {{placeholder for Gmail account name}}

              Here's what you should do in this email: ${directive}  

              Here's the context on this person: ${userInfo}  
              Here's the context on this person's business: ${businessInfo}   
              Frame it in a way where you saw they just signed up for: ${businessContext.purpose}
              And lastly, here's the context on my business: ${businessContext.websiteSummary || businessContext.additionalContext || ''}`
            }]
          })
        })

        if (!emailBodyResponse.ok) throw new Error('Failed to generate email body')
        const data = await emailBodyResponse.json()
        const body = data.choices[0].message.content

        await logsUtils.addLog({
          type: 'api',
          status: 'success',
          details: 'Successfully generated email body',
          response: body,
          workspaceId,
          agentId
        })

        return body
      })(),

      // Generate Subject Line (can start this at the same time as the body)
      (async () => {
        await logsUtils.addLog({
          type: 'api',
          status: 'pending',
          details: 'Generating subject line',
          workspaceId,
          agentId
        })

        const subjectResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://agentfolio.ai',
            'X-Title': 'Agentfolio'
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [{
              role: 'user',
              content: `Write a short, email subject line for a personalized email to a new lead.
              Make it personal and seem like it is just a casual email from someone they know. Do not use placeholders. Do not put "Subject: " before the subject line. Just write the subject line and that's it.
              Context about them: ${userInfo}`
            }]
          })
        })

        if (!subjectResponse.ok) throw new Error('Failed to generate subject line')
        const data = await subjectResponse.json()
        const subject = data.choices[0].message.content

        await logsUtils.addLog({
          type: 'api',
          status: 'success',
          details: 'Successfully generated subject line',
          response: subject,
          workspaceId,
          agentId
        })

        return subject
      })()
    ])

    // Log successful completion
    await logsUtils.addLog({
      type: 'api',
      status: 'success',
      details: 'Email generation completed successfully',
      workspaceId,
      agentId
    })

    return NextResponse.json({
      success: true,
      email: {
        to: signupInfo.match(/Email: ([^\n]+)/)?.[1] || 'recipient@example.com',
        subject,
        body: emailBody
      }
    })

  } catch (error) {
    console.error('Email generation error:', error)
    await logsUtils.addLog({
      type: 'api',
      status: 'failed',
      details: 'Email generation failed',
      response: error instanceof Error ? error.message : 'Unknown error',
      workspaceId: workspaceId,
      agentId: agentId
    })
    return NextResponse.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    )
  }
} 