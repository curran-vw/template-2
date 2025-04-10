import { db } from '@/app/lib/firebase/firebase'
import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, orderBy } from 'firebase/firestore'
import { WelcomeAgent } from '../types/welcome-agent'
import { gmailUtils } from '@/app/lib/firebase/gmailUtils'
import { emailHistoryUtils } from '@/app/lib/firebase/emailHistoryUtils'
import { logsUtils } from '@/app/lib/firebase/logsUtils'

const COLLECTION_NAME = 'welcomeAgents'

export const welcomeAgentUtils = {
  async createWelcomeAgent(workspaceId: string, agent: Omit<WelcomeAgent, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) {
    console.log('createWelcomeAgent called with:', { workspaceId, agent })
    
    if (!workspaceId) {
      throw new Error('Workspace ID is required')
    }

    const timestamp = Date.now()
    const newAgent: WelcomeAgent = {
      ...agent,
      workspaceId,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    try {
      console.log('Creating new agent document with data:', newAgent)
      const docRef = doc(collection(db, COLLECTION_NAME))
      await setDoc(docRef, newAgent)
      console.log('Document created with ID:', docRef.id)
      
      const createdAgent = { ...newAgent, id: docRef.id }
      console.log('Returning created agent:', createdAgent)
      return createdAgent
    } catch (error) {
      console.error('Error in createWelcomeAgent:', error)
      throw error
    }
  },

  async updateWelcomeAgent(agentId: string, updates: Partial<WelcomeAgent>) {
    const docRef = doc(db, COLLECTION_NAME, agentId)
    const updates_with_timestamp = {
      ...updates,
      updatedAt: Date.now()
    }
    await setDoc(docRef, updates_with_timestamp, { merge: true })
  },

  async getWelcomeAgent(agentId: string) {
    console.log('Getting welcome agent:', agentId)
    const docRef = doc(db, COLLECTION_NAME, agentId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      console.log('Welcome agent not found:', agentId)
      return null
    }
    
    const agent = { 
      id: docSnap.id, 
      ...docSnap.data() 
    } as WelcomeAgent
    console.log('Found welcome agent:', agent)
    return agent
  },

  async getWorkspaceWelcomeAgents(workspaceId: string) {
    console.log('Fetching welcome agents for workspace:', workspaceId)
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('workspaceId', '==', workspaceId)
      )
      const querySnapshot = await getDocs(q)
      const agents = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as WelcomeAgent[]
      console.log('Fetched welcome agents:', agents)
      return agents
    } catch (error) {
      console.error('Error fetching welcome agents:', error)
      throw error
    }
  },

  async deleteWelcomeAgent(agentId: string) {
    await deleteDoc(doc(db, COLLECTION_NAME, agentId))
  },

  async generateWelcomeEmail(agent: WelcomeAgent, signupInfo: any) {
    console.log('Generating welcome email for:', {
      agentId: agent.id,
      signupInfo
    })

    try {
      // Get the Gmail connection to get the sender's name
      const gmailConnection = await gmailUtils.getConnectionByEmail(agent.configuration?.emailAccount || '')
      const senderName = gmailConnection?.name || agent.configuration?.emailAccount || 'the team'

      // Run first two prompts in parallel for performance
      const [userInfoResponse, businessInfoResponse] = await Promise.all([
        // First Prompt - User Info
        fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://agentfolio.ai',
            'X-Title': 'Agentfolio'
          },
          body: JSON.stringify({
            model: 'perplexity/sonar',
            messages: [{
              role: 'user',
              content: `Do a search for this user. Here's the sign up email we got with their info: ${signupInfo.rawContent}. 
              Make sure to only look at the user's info. 
              Come back with only info about who they are, what business they work for, etc. 
              Include contact information if you can find it. 
              Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
              For extra context, they signed up for: ${agent.businessContext?.purpose || ''}`
            }]
          })
        }).then(async res => {
          const data = await res.json()
          if (!res.ok) throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`)
          return data?.choices?.[0]?.message?.content || 'No user information found.'
        }),

        // Second Prompt - Business Info
        fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://agentfolio.ai',
            'X-Title': 'Agentfolio'
          },
          body: JSON.stringify({
            model: 'perplexity/sonar',
            messages: [{
              role: 'user',
              content: `Do a search for the business associated with this signup: ${signupInfo.rawContent}... 
              Come back with only info about who they are, what business they do, industry, etc. 
              Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
              For extra context, they signed up for ${agent.businessContext?.purpose || ''}`
            }]
          })
        }).then(async res => {
          const data = await res.json()
          if (!res.ok) throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`)
          return data?.choices?.[0]?.message?.content || 'No business information found.'
        })
      ])

      console.log('AI responses:', {
        userInfo: userInfoResponse,
        businessInfo: businessInfoResponse
      })

      // Third Prompt - Generate Email Body
      const emailBodyResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://agentfolio.ai',
          'X-Title': 'Agentfolio'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.7-sonnet',
          messages: [{
            role: 'user',
            content: `We are writing the HTML body using <p> and <br> tags of a personalized email today to a new lead that just signed up 
              (keep it max of 2-3 paragraphs and MAX 1-2 sentences per paragraph). 
              Do not include the subject line. 
              Make it read like a human sent it after looking up their company and make it clear we know what they do without jargon.  
              Make it pretty casual and welcoming with an 8th grade reading level. 
              If business info is unclear, keep it generic to the industry; if user info is clear, make it more specific.
              Don't use placeholders like [calendar link] and don't make note that it's a template.
              Address the person by first name if available (but just make it general if no name is provided). 
              Sign off with this exact name: ${senderName}

            Please use the following directive for your email. If it specifies a different length, please adjust accordingly: ${agent.emailPurpose?.directive || ''}  

            Here's the context on this person: ${userInfoResponse}  
            Here's the context on this person's business: ${businessInfoResponse}   
            Frame it in a way where you saw they just signed up for: ${agent.businessContext?.purpose || ''}
            And lastly, here's the context on my business: ${agent.businessContext?.websiteSummary || ''}`
          }]
        })
      }).then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`)
        return data?.choices?.[0]?.message?.content || 'Error generating email body.'
      })

      console.log('Generated email body:', emailBodyResponse)

      // Fourth Prompt - Generate Subject Line
      const subjectResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://agentfolio.ai',
          'X-Title': 'Agentfolio'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.7-sonnet',
          messages: [{
            role: 'user',
            content: `Write a short, email subject line for a personalized email to a new lead.
              Make it personal and seem like it is just a casual email from someone they know. Do not use placeholders or emojis. Do not put "Subject: " before the subject line. Just write the subject line and that's it.
              Context about them: ${userInfoResponse}`
          }]
        })
      }).then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`)
        return data?.choices?.[0]?.message?.content || 'Welcome!'
      })

      console.log('Generated subject:', subjectResponse)

      const emailDetails = {
        subject: subjectResponse,
        body: emailBodyResponse
      }

      // Check if email should be reviewed before sending
      const shouldReview = agent.configuration?.settings?.reviewBeforeSending ?? false
      const status = shouldReview ? 'under_review' : 'sent'

      // Get the Gmail connection ID
      const senderGmailConnection = await gmailUtils.getConnectionByEmail(agent.configuration?.emailAccount || '')
      if (!senderGmailConnection) {
        throw new Error(`No Gmail connection found for email: ${agent.configuration?.emailAccount}`)
      }

      // Create email history record with AI responses
      try {
        const emailId = await emailHistoryUtils.createEmailRecord({
          recipientEmail: signupInfo.email || signupInfo.rawContent.email,
          agentId: agent.id || '',
          agentName: agent.name,
          workspaceId: agent.workspaceId,
          subject: emailDetails.subject,
          body: emailDetails.body,
          status,
          gmailConnectionId: senderGmailConnection.id,
          userInfo: userInfoResponse,  // Store the AI response instead of raw input
          businessInfo: businessInfoResponse  // Store the AI response instead of raw input
        })

        // Log the email generation
        await logsUtils.addLog({
          type: 'email',
          status: 'success',  // Use 'success' instead of 'under_review'
          details: `Generated email for ${signupInfo.email || signupInfo.rawContent.email}`,
          workspaceId: agent.workspaceId,
          agentId: agent.id
        })

        return {
          id: emailId,
          ...emailDetails,
          status
        }
      } catch (recordError) {
        console.error('Error recording email:', recordError)
      }

      return emailDetails
    } catch (error) {
      console.error('Error generating welcome email:', error)
      
      // Create a record of the failed attempt
      const failedEmailDetails = {
        subject: `Welcome to ${agent.name}!`,
        body: `Thank you for signing up! We'll be in touch soon.`
      }

      try {
        await emailHistoryUtils.createEmailRecord({
          recipientEmail: signupInfo.email,
          agentId: agent.id || '',
          agentName: agent.name,
          workspaceId: agent.workspaceId,
          subject: failedEmailDetails.subject,
          body: failedEmailDetails.body,
          status: 'failed',
          userInfo: 'No user information available.',
          businessInfo: 'No business information available.',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      } catch (recordError) {
        console.error('Error creating failure record:', recordError)
      }

      return failedEmailDetails
    }
  },

  async logEmailEvent(eventData: any) {
    // TODO: Implement logging
    console.log('Logging email event:', eventData)
  },

  async getWelcomeAgents(workspaceId: string) {
    try {
      if (!workspaceId) {
        throw new Error('Workspace ID is required')
      }

      const agentsQuery = query(
        collection(db, COLLECTION_NAME),
        where('workspaceId', '==', workspaceId),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(agentsQuery)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WelcomeAgent[]
    } catch (error) {
      console.error('Error getting welcome agents:', error)
      throw error
    }
  }
}

// Helper functions to extract info for email history
function extractUserInfo(signupInfo: any): string {
  try {
    // If signupInfo is a string, process it as before
    if (typeof signupInfo === 'string') {
      const lines = signupInfo.split('\n')
      return lines
        .filter(line => line.trim())
        .map(line => {
          const [key, value] = line.split(':').map(s => s.trim())
          return `${key}: ${value}`
        })
        .join('\n')
    }
    
    // If signupInfo is an object, format it
    if (typeof signupInfo === 'object') {
      const info = []
      if (signupInfo.email) info.push(`Email: ${signupInfo.email}`)
      if (signupInfo.sender) info.push(`Name: ${signupInfo.sender}`)
      if (signupInfo.subject) info.push(`Subject: ${signupInfo.subject}`)
      return info.join('\n')
    }

    return String(signupInfo)
  } catch (error) {
    console.error('Error extracting user info:', error)
    return String(signupInfo)
  }
}

function extractBusinessInfo(businessContext: any): string {
  try {
    const info = []
    if (businessContext.website) {
      info.push(`Website: ${businessContext.website}`)
    }
    if (businessContext.purpose) {
      info.push(`Purpose: ${businessContext.purpose}`)
    }
    if (businessContext.websiteSummary) {
      info.push(`Summary: ${businessContext.websiteSummary}`)
    }
    if (businessContext.additionalContext) {
      info.push(`Additional Context: ${businessContext.additionalContext}`)
    }
    return info.join('\n')
  } catch (error) {
    console.error('Error extracting business info:', error)
    return JSON.stringify(businessContext)
  }
} 