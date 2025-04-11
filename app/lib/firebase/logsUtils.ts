import { db } from './firebase'
import { collection, addDoc, query, orderBy, getDocs, QueryConstraint, limit as firestoreLimit, where, startAfter, Timestamp, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'

const COLLECTION_NAME = 'logs'

export interface LogRecord {
  id: string
  timestamp: Date
  type: 'api' | 'crawl' | 'email'
  status: 'success' | 'failed' | 'pending'
  details: string
  response?: string
  workspaceId?: string
  agentId?: string
}

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

  async getRecentLogs(page = 1, pageSize = 10, logType: 'api' | 'crawl' | 'email' | 'all' = 'all') {
    try {
      // Create base constraints
      const constraints: QueryConstraint[] = [
        orderBy('timestamp', 'desc')
      ]
      
      // Add type filter if not 'all'
      if (logType !== 'all') {
        constraints.push(where('type', '==', logType))
      }
      
      // Get total count for pagination info
      const countQuery = query(collection(db, COLLECTION_NAME), ...constraints)
      const countSnapshot = await getDocs(countQuery)
      const totalLogs = countSnapshot.docs.length
      const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize))
      
      // Add pagination for Firestore query
      const paginationConstraints = [...constraints, firestoreLimit(pageSize)]
      
      let paginatedQuery
      let snapshot
      
      if (page === 1) {
        // For first page, just use the limit
        paginatedQuery = query(collection(db, COLLECTION_NAME), ...paginationConstraints)
      } else {
        // For subsequent pages, fetch all documents up to the start of the requested page
        // and then get only the ones for the requested page
        const previousPageQuery = query(
          collection(db, COLLECTION_NAME),
          ...constraints,
          firestoreLimit((page - 1) * pageSize)
        )
        
        const previousDocs = await getDocs(previousPageQuery)
        
        // If we have enough documents to reach the requested page
        if (previousDocs.docs.length === (page - 1) * pageSize) {
          // Get the last document from the previous page
          const lastVisible = previousDocs.docs[previousDocs.docs.length - 1]
          
          // Start after that document and limit to pageSize
          paginatedQuery = query(
            collection(db, COLLECTION_NAME),
            ...constraints,
            startAfter(lastVisible),
            firestoreLimit(pageSize)
          )
        } else {
          // Not enough documents to reach the requested page
          return {
            logs: [],
            pagination: {
              currentPage: page,
              totalPages,
              totalLogs,
              hasNextPage: false,
              hasPreviousPage: page > 1
            }
          }
        }
      }
      
      // Execute the query
      snapshot = await getDocs(paginatedQuery)
      
      // Map the documents to the expected format
      const logs = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          timestamp: new Date(data.timestamp),
          type: data.type as 'api' | 'crawl' | 'email',
          status: data.status as 'success' | 'failed' | 'pending',
          details: data.details
        } as LogRecord
      })
      
      return {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalLogs,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    } catch (error) {
      console.error('Error getting logs:', error)
      throw error
    }
  }
} 