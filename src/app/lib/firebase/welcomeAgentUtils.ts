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
    const docRef = doc(db, COLLECTION_NAME, agentId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as WelcomeAgent
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
  }
} 