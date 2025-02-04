import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { logsUtils } from '@/app/lib/firebase/logsUtils'

export async function POST(req: Request) {
  let url: string = ''
  let workspaceId: string = ''
  let agentId: string = ''

  try {
    const body = await req.json()
    url = body.url
    workspaceId = body.workspaceId
    agentId = body.agentId

    // Log the start of crawling
    console.log(`Starting crawl of URL: ${url}`)
    
    // Create initial log entry
    const logId = await logsUtils.addLog({
      type: 'crawl',
      status: 'pending',
      details: `Starting crawl of ${url}`,
      workspaceId,
      agentId
    })

    // Validate URL
    try {
      new URL(url)
    } catch (e) {
      await logsUtils.addLog({
        type: 'crawl',
        status: 'failed',
        details: `Invalid URL: ${url}`,
        workspaceId,
        agentId
      })
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the webpage
    console.log('Fetching webpage...')
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentfolioBot/1.0; +https://agentfolio.ai)'
      }
    })

    if (!response.ok) {
      await logsUtils.addLog({
        type: 'crawl',
        status: 'failed',
        details: `Failed to fetch ${url}`,
        response: `Status: ${response.status} ${response.statusText}`,
        workspaceId,
        agentId
      })
      return NextResponse.json(
        { error: 'Failed to fetch webpage' },
        { status: response.status }
      )
    }

    // Get the HTML content
    const html = await response.text()
    console.log('Successfully fetched webpage, parsing content...')

    // Use cheerio to parse the HTML
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $('script').remove()
    $('style').remove()
    $('noscript').remove()
    $('iframe').remove()
    $('svg').remove()
    $('img').remove()
    $('header').remove()
    $('footer').remove()
    $('nav').remove()
    $('.header').remove()
    $('.footer').remove()
    $('.nav').remove()
    $('.menu').remove()
    $('.sidebar').remove()
    $('.advertisement').remove()
    $('.cookie-banner').remove()

    // Get the cleaned text content
    let text = $('body').text()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()

    // Truncate if too long (OpenRouter has context limits)
    const MAX_CHARS = 15000
    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS) + '...'
    }

    console.log('Successfully parsed webpage content')
    console.log('Content length:', text.length, 'characters')

    // Now let's summarize with GPT4o-mini via OpenRouter
    console.log('Sending to OpenRouter for summarization...')
    
    // Log the OpenRouter API call
    await logsUtils.addLog({
      type: 'api',
      status: 'pending',
      details: `Sending content to OpenRouter for summarization`,
      workspaceId,
      agentId
    })

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agentfolio.ai',
        'X-Title': 'Agentfolio'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes website content into clear, concise business descriptions. Focus on what the business does, who they serve, and their main value proposition.'
          },
          {
            role: 'user',
            content: `Please summarize this website content in 2-3 sentences, focusing on the core business offering:\n\n${text}`
          }
        ]
      })
    })

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      await logsUtils.addLog({
        type: 'api',
        status: 'failed',
        details: 'OpenRouter API error',
        response: errorText,
        workspaceId,
        agentId
      })
      return NextResponse.json(
        { error: 'Failed to summarize content' },
        { status: 500 }
      )
    }

    const aiResponse = await openRouterResponse.json()
    const summary = aiResponse.choices[0].message.content

    // Log successful completion
    await logsUtils.addLog({
      type: 'crawl',
      status: 'success',
      details: `Successfully crawled and summarized ${url}`,
      response: summary,
      workspaceId,
      agentId
    })

    console.log('Successfully generated summary')
    
    return NextResponse.json({
      success: true,
      rawContent: text,
      summary
    })

  } catch (error) {
    await logsUtils.addLog({
      type: 'crawl',
      status: 'failed',
      details: `Error processing ${url || 'unknown URL'}`,
      response: error instanceof Error ? error.message : 'Unknown error',
      workspaceId,
      agentId
    })
    return NextResponse.json(
      { error: 'Failed to process webpage' },
      { status: 500 }
    )
  }
} 