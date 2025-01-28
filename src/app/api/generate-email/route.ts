import { NextResponse } from 'next/server'
import { logsUtils } from '@/app/lib/firebase/logsUtils'

export async function POST(req: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const body = await req.json()
    const { prompt, workspaceId, agentId } = body

    if (!prompt || !workspaceId || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Log the start of email generation
    await logsUtils.addLog({
      type: 'email',
      status: 'pending',
      details: 'Starting email generation',
      workspaceId,
      agentId
    })

    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Agentfolio'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email writer.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      console.error('OpenRouter API error:', errorText)
      
      await logsUtils.addLog({
        type: 'email',
        status: 'failed',
        details: 'OpenRouter API error',
        response: errorText,
        workspaceId,
        agentId
      })
      
      return NextResponse.json(
        { error: `OpenRouter API error: ${errorText}` },
        { status: openRouterResponse.status }
      )
    }

    const aiResponse = await openRouterResponse.json()
    
    if (!aiResponse?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenRouter API')
    }
    
    const emailContent = aiResponse.choices[0].message.content

    // Log successful completion
    await logsUtils.addLog({
      type: 'email',
      status: 'success',
      details: 'Successfully generated email',
      response: emailContent,
      workspaceId,
      agentId
    })

    return NextResponse.json({
      success: true,
      emailContent
    })

  } catch (error) {
    console.error('Email generation error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const workspaceId = error?.workspaceId || 'unknown'
    const agentId = error?.agentId || 'unknown'
    
    await logsUtils.addLog({
      type: 'email',
      status: 'failed',
      details: 'Error generating email',
      response: errorMessage,
      workspaceId,
      agentId
    })

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 