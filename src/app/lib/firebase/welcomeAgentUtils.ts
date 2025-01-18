import { db } from '@/app/lib/firebase/firebase'
import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { WelcomeAgent } from '../types/welcome-agent'

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
      // Run first two prompts in parallel for performance
      const [userInfoResponse, businessInfoResponse] = await Promise.all([
        // First Prompt - User Info
        fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://agentfolio.ai',
            'X-Title': 'Agentfolio'
          },
          body: JSON.stringify({
            model: 'perplexity/llama-3.1-sonar-huge-128k-online',
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
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://agentfolio.ai',
          'X-Title': 'Agentfolio'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [{
            role: 'user',
            content: `Write the body of a personalized email using HTML formatting. Format requirements:            Make it read like a human sent it after looking up their company and make it clear we know what they do without jargon.  
            - Use <p> tags for each paragraph
            - Keep it to 1-3 paragraphs
            - MAX 1-2 sentences per paragraph
            - If not sure about whether its actually the person or business, just make it generic
            - Add <br> tags for line breaks where natural
            - Do not include a subject line
            - Make it read like a human sent it
            - Make it clear we know what they do without jargon
            - Keep it casual and welcoming (8th grade reading level)
            - If no specific info available, make it generic (don't mention it's a template)
            - Don't use placeholders like [calendar link]
            - Address by first name if available (general greeting if no name)
            - Add a line break before the signature
            - Sign off from ${agent.configuration?.emailAccount || 'the team'}

            Here's what you should do in this email: ${agent.emailPurpose?.directive || ''}  

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
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://agentfolio.ai',
          'X-Title': 'Agentfolio'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-sonnet',
          messages: [{
            role: 'user',
            content: `Write an email subject line for this email below. 
            Do not use any placeholders. 
            Only return one short email subject line and make it look like it's a personal email 
            to them from someone they know and they want to click it. 
            (do not mention that it's a subject line or return anything other than the subject line).

            Here's the email: ${emailBodyResponse}`
          }]
        })
      }).then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`)
        return data?.choices?.[0]?.message?.content || 'Welcome!'
      })

      console.log('Generated subject:', subjectResponse)

      return {
        subject: subjectResponse,
        body: emailBodyResponse
      }
    } catch (error) {
      console.error('Error generating welcome email:', error)
      // Return a fallback email instead of throwing
      return {
        subject: `Welcome to ${agent.name}!`,
        body: `Thank you for signing up! We'll be in touch soon.`
      }
    }
  },

  async logEmailEvent(eventData: any) {
    // TODO: Implement logging
    console.log('Logging email event:', eventData)
  }
} 