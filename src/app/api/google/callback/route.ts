import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const headersList = headers()
  const host = headersList.get('host')
  
  const redirectUri = host?.includes('localhost') 
    ? 'http://localhost:3000/api/google/callback'
    : 'https://936f9f5e-b596-4eec-be4b-6f7f19e7f0b7-00-8nnd3a2nu6we.worf.replit.dev/api/google/callback'

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Missing OAuth credentials:', { 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret 
    })
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage(
              { type: 'GMAIL_ERROR', error: 'OAuth credentials not configured' }, 
              '*'
            );
            window.close();
          </script>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cross-Origin-Opener-Policy': 'unsafe-none'
        },
      }
    )
  }

  console.log('Callback received with host:', host)
  console.log('Using redirect URI:', redirectUri)
  
  const searchParams = new URL(request.url).searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('Google returned error:', error)
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage(
              { type: 'GMAIL_ERROR', error: 'Google authorization failed: ${error}' }, 
              '*'
            );
            window.close();
          </script>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cross-Origin-Opener-Policy': 'unsafe-none'
        },
      }
    )
  }

  if (!code) {
    console.error('No code received in callback')
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage(
              { type: 'GMAIL_ERROR', error: 'No authorization code received' }, 
              '*'
            );
            window.close();
          </script>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cross-Origin-Opener-Policy': 'unsafe-none'
        },
      }
    )
  }

  try {
    console.log('Exchanging code for tokens...')
    const tokenParams = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }
    console.log('Token request params:', {
      ...tokenParams,
      client_secret: '[REDACTED]'
    })

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenParams),
    })

    const responseText = await tokenResponse.text()
    console.log('Token response status:', tokenResponse.status)
    console.log('Token response headers:', Object.fromEntries(tokenResponse.headers))
    
    let tokens
    try {
      tokens = JSON.parse(responseText)
      console.log('Token response parsed:', {
        ...tokens,
        access_token: tokens.access_token ? '[PRESENT]' : '[MISSING]',
        refresh_token: tokens.refresh_token ? '[PRESENT]' : '[MISSING]',
      })
    } catch (e) {
      console.log('Failed to parse token response as JSON:', responseText)
      throw new Error('Failed to parse token response')
    }

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${responseText}`)
    }

    // Get user info
    console.log('Fetching user info...')
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      const error = await userResponse.text()
      console.error('User info error:', error)
      throw new Error('Failed to get user info')
    }

    const userInfo = await userResponse.json()
    console.log('Received user info:', { email: userInfo.email, name: userInfo.name })

    // Return HTML that closes the popup and sends success message
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            (function() {
              try {
                const data = {
                  type: 'GMAIL_CONNECTED',
                  email: '${userInfo.email}',
                  name: '${userInfo.name || ''}',
                  tokens: ${JSON.stringify(tokens)}
                };
                
                if (window.opener) {
                  window.opener.postMessage(data, '*');
                  console.log('Message sent to opener');
                } else {
                  console.error('No opener found');
                }
              } catch (e) {
                console.error('Error:', e);
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'GMAIL_ERROR', 
                    error: 'Failed to process response' 
                  }, '*');
                }
              } finally {
                setTimeout(() => window.close(), 1000);
              }
            })();
          </script>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cross-Origin-Opener-Policy': 'unsafe-none',
          'Cross-Origin-Embedder-Policy': 'unsafe-none'
        },
      }
    )
  } catch (error) {
    console.error('OAuth error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            (function() {
              try {
                window.opener.postMessage(
                  { 
                    type: 'GMAIL_ERROR', 
                    error: 'Failed to connect Gmail account',
                    details: ${JSON.stringify(error instanceof Error ? error.message : 'Unknown error')}
                  }, 
                  '*'
                );
              } catch (e) {
                console.error('Error sending error message:', e);
              } finally {
                setTimeout(() => window.close(), 1000);
              }
            })();
          </script>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cross-Origin-Opener-Policy': 'unsafe-none',
          'Cross-Origin-Embedder-Policy': 'unsafe-none'
        },
      }
    )
  }
} 