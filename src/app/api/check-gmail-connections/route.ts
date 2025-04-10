import { NextResponse } from 'next/server'
import { gmailUtils } from '@/app/lib/firebase/gmailUtils'

export async function POST(request: Request) {
  try {
    // Get workspace ID from request
    const { workspaceId } = await request.json()
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    // Check and fix inactive connections
    const result = await gmailUtils.checkAndFixInactiveConnections(workspaceId)

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Error checking Gmail connections:', error)
    return NextResponse.json(
      { error: 'Failed to check Gmail connections' },
      { status: 500 }
    )
  }
} 