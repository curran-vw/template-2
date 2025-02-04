import { db } from './firebase'
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore'
import { encode } from 'js-base64'

interface GmailTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
  token_type: string
}

interface GmailConnection {
  id: string
  email: string
  name: string
  tokens: GmailTokens
  workspaceId: string
  userId: string
  connected_at: number
  isActive?: boolean
}

interface SendEmailParams {
  connectionId: string
  to: string
  subject: string
  body: string
}

export const gmailUtils = {
  async saveGmailConnection(
    workspaceId: string, 
    userId: string, 
    email: string, 
    name: string, 
    tokens: GmailTokens
  ) {
    console.log('Starting saveGmailConnection:', { workspaceId, userId, email, name })
    
    try {
      const connectionData = {
        email,
        name,
        tokens,
        workspaceId,
        userId,
        connected_at: Date.now(),
        isActive: true
      }

      // Check if connection already exists
      const existingConnections = await this.getWorkspaceConnections(workspaceId)
      console.log('Existing connections:', existingConnections)
      
      const existing = existingConnections.find(conn => conn.email === email)
      console.log('Found existing connection:', existing)

      let connectionId: string
      
      if (existing && existing.id) {
        console.log('Updating existing connection:', existing.id)
        const connectionRef = doc(db, 'gmail_connections', existing.id)
        await setDoc(connectionRef, connectionData, { merge: true })
        connectionId = existing.id
      } else {
        console.log('Creating new connection')
        const connectionRef = doc(collection(db, 'gmail_connections'))
        await setDoc(connectionRef, connectionData)
        connectionId = connectionRef.id
      }

      // Verify the connection was saved
      const savedConnection = await this.getConnection(connectionId)
      console.log('Saved connection:', savedConnection)

      return connectionId
    } catch (error) {
      console.error('Error in saveGmailConnection:', error)
      throw error
    }
  },

  async getWorkspaceConnections(workspaceId: string) {
    console.log('Getting workspace connections for:', workspaceId)
    try {
      const connectionsRef = collection(db, 'gmail_connections')
      const q = query(connectionsRef, where('workspaceId', '==', workspaceId))
      const snapshot = await getDocs(q)
      
      const connections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GmailConnection[]
      
      console.log('Found connections:', connections)
      return connections
    } catch (error) {
      console.error('Error in getWorkspaceConnections:', error)
      throw error
    }
  },

  async removeConnection(connectionId: string) {
    await deleteDoc(doc(db, 'gmail_connections', connectionId))
  },

  async refreshTokenIfNeeded(connectionId: string) {
    console.log('Checking if token needs refresh for connection:', connectionId)
    const connectionRef = doc(db, 'gmail_connections', connectionId)
    const connection = await getDoc(connectionRef)
    
    if (!connection.exists()) {
      console.error('Gmail connection not found:', connectionId)
      throw new Error('Gmail connection not found')
    }

    const data = connection.data() as GmailConnection
    const expiryDate = data.tokens.expiry_date

    // If token expires in less than 5 minutes, refresh it
    if (Date.now() + 5 * 60 * 1000 >= expiryDate) {
      console.log('Token needs refresh, refreshing...')
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: data.tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      const newTokens = await response.json()
      
      // Update tokens in database
      await setDoc(connectionRef, {
        ...data,
        tokens: {
          ...data.tokens,
          access_token: newTokens.access_token,
          expiry_date: Date.now() + (newTokens.expires_in * 1000)
        }
      }, { merge: true })

      console.log('Token refreshed successfully')
      return newTokens.access_token
    }

    console.log('Token still valid, using existing token')
    return data.tokens.access_token
  },

  async sendEmail({ connectionId, to, subject, body }: SendEmailParams) {
    try {
      console.log('Attempting to send email:', { connectionId, to, subject })

      // Get the connection details
      const connection = await this.getConnectionById(connectionId)
      if (!connection) {
        const connections = await this.getWorkspaceConnections('uIRfO3U9XyCw2eIbeeFb')
        const availableEmails = connections.map(c => c.email).join(', ')
        throw new Error(`No Gmail connection found for ID: ${connectionId}. Available connections: ${availableEmails}`)
      }

      // Type assertion to ensure TypeScript knows connection has all GmailConnection properties
      const connectionDetails: GmailConnection = connection

      console.log('Using Gmail connection:', {
        id: connectionDetails.id,
        email: connectionDetails.email,
        name: connectionDetails.name
      })

      // Get fresh access token
      const accessToken = await this.refreshTokenIfNeeded(connectionId)

      // Construct the email in RFC 822 format with proper From header
      const emailContent = [
        'Content-Type: text/html; charset="UTF-8"',
        'MIME-Version: 1.0',
        `To: ${to}`,
        `From: "${connectionDetails.name}" <${connectionDetails.email}>`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\r\n')

      // Encode the email content
      const encodedEmail = encode(emailContent)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      // Send the email via Gmail API
      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Goog-AuthUser': '0'
          },
          body: JSON.stringify({
            raw: encodedEmail
          })
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to send email: ${error}`)
      }

      const result = await response.json()
      console.log('Email sent successfully:', result)
      return result
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  },

  async testEmailConnection(connectionId: string) {
    try {
      const connection = await this.getConnection(connectionId)
      if (!connection) {
        throw new Error('Connection not found')
      }

      // Send a test email
      await this.sendEmail({
        connectionId,
        to: connection.email,
        subject: 'Welcome Agent - Test Connection',
        body: `
        <p>This is a test email from your Welcome Agent.</p>
        <p>If you're receiving this, your email connection is working correctly!</p>
        <p>You can now start using this email account to send welcome emails to your new signups.</p>
        `
      })

      return true
    } catch (error) {
      console.error('Test email failed:', error)
      throw error
    }
  },

  async getConnection(connectionId: string) {
    const connectionRef = doc(db, 'gmail_connections', connectionId)
    const connection = await getDoc(connectionRef)
    
    if (!connection.exists()) {
      return null
    }

    return {
      id: connection.id,
      ...connection.data()
    } as GmailConnection
  },

  async getConnectionByEmail(email: string): Promise<GmailConnection | null> {
    console.log('Looking up Gmail connection for:', email)
    const connectionsRef = collection(db, 'gmail_connections')
    
    // Add isActive field if it doesn't exist in the query
    const q = query(connectionsRef, where('email', '==', email))
    const snapshot = await getDocs(q)
    
    console.log('Query results:', {
      empty: snapshot.empty,
      count: snapshot.docs.length,
      docs: snapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        isActive: doc.data().isActive
      }))
    })
    
    if (snapshot.empty) {
      console.log('No Gmail connection found for:', email)
      return null
    }
    
    const connection = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as GmailConnection
    
    console.log('Found Gmail connection:', connection)
    return connection
  },

  async getConnectionById(connectionId: string): Promise<GmailConnection | null> {
    const connectionRef = doc(db, 'gmail_connections', connectionId)
    const snapshot = await getDoc(connectionRef)
    if (!snapshot.exists()) return null
    return {
      id: snapshot.id,
      ...snapshot.data()
    } as GmailConnection
  }
} 