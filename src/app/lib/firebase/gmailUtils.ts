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
  id?: string
  email: string
  name: string
  tokens: GmailTokens
  workspaceId: string
  userId: string
  connected_at: number
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
      // Check if connection already exists
      const existingConnections = await this.getWorkspaceConnections(workspaceId)
      console.log('Existing connections:', existingConnections)
      
      const existing = existingConnections.find(conn => conn.email === email)
      console.log('Found existing connection:', existing)

      const connectionData = {
        email,
        name,
        tokens,
        workspaceId,
        userId,
        connected_at: Date.now()
      }

      let connectionId: string
      
      if (existing) {
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

      console.log('Connection saved successfully:', connectionId)
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
    const connectionRef = doc(db, 'gmail_connections', connectionId)
    const connection = await getDoc(connectionRef)
    
    if (!connection.exists()) {
      throw new Error('Gmail connection not found')
    }

    const data = connection.data() as GmailConnection
    const expiryDate = data.tokens.expiry_date

    // If token expires in less than 5 minutes, refresh it
    if (Date.now() + 5 * 60 * 1000 >= expiryDate) {
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

      return newTokens.access_token
    }

    return data.tokens.access_token
  },

  async sendEmail(
    connectionId: string,
    to: string,
    subject: string,
    body: string
  ) {
    try {
      // Get fresh access token
      const accessToken = await this.refreshTokenIfNeeded(connectionId)

      // Construct the email in RFC 822 format
      const emailContent = [
        'Content-Type: text/html; charset="UTF-8"',
        'MIME-Version: 1.0',
        `To: ${to}`,
        'From: me', // Gmail API uses 'me' to represent the authenticated user
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
      await this.sendEmail(
        connectionId,
        connection.email, // Send to the same email
        'Welcome Agent - Test Connection',
        `
        <p>This is a test email from your Welcome Agent.</p>
        <p>If you're receiving this, your email connection is working correctly!</p>
        <p>You can now start using this email account to send welcome emails to your new signups.</p>
        `
      )

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
  }
} 