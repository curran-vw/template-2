import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = headers()
  const host = headersList.get('host')
  
  const redirectUri = host?.includes('localhost') 
    ? 'http://localhost:3000/api/google/callback'
    : 'https://936f9f5e-b596-4eec-be4b-6f7f19e7f0b7-00-8nnd3a2nu6we.worf.replit.dev/api/google/callback'
  
  console.log('Initiating OAuth flow with host:', host)
  console.log('Using redirect URI:', redirectUri)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured')
  }

  // Configure OAuth 2.0 parameters
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'offline',
    prompt: 'consent'
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  console.log('Redirecting to:', googleAuthUrl)
  
  return NextResponse.redirect(googleAuthUrl)
} 