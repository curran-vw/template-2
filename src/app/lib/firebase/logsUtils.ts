import { db } from './firebase'
import { collection, addDoc, query, orderBy, getDocs, QueryConstraint, limit as firestoreLimit } from 'firebase/firestore'

const COLLECTION_NAME = 'logs'

export const logsUtils = {
  async addLog(data: {
    type: 'api' | 'crawl' | 'email'
    status: 'success' | 'failed' | 'pending'
    details: string
    response?: string
    workspaceId?: string
    agentId?: string
  }) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        timestamp: Date.now()
      })
      console.log('Log added with ID:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('Error adding log:', error)
      throw error
    }
  },

  async getRecentLogs(limitCount = 100) {
    const constraints: QueryConstraint[] = [
      orderBy('timestamp', 'desc'),
      firestoreLimit(limitCount)
    ]
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints)
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }
} 