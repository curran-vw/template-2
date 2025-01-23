import { db } from '@/app/lib/firebase/firebase'
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  getDoc,
} from 'firebase/firestore'
import { gmailUtils } from './gmailUtils'

interface EmailRecord {
  id: string
  recipientEmail: string
  status: 'sent' | 'under_review' | 'denied' | 'failed'
  createdAt: Date
  agentId: string
  agentName: string
  subject: string
  body: string
  workspaceId: string
  error?: string
  gmailConnectionId?: string
}

export const emailHistoryUtils = {
  async getEmailHistory(workspaceId: string, agentId: string | null = null) {
    try {
      console.log('Getting email history:', { workspaceId, agentId }) // Debug log

      // Create query constraints array
      const constraints = [
        where('workspaceId', '==', workspaceId),
        orderBy('createdAt', 'desc')
      ]

      // Add agentId constraint if provided
      if (agentId) {
        constraints.unshift(where('agentId', '==', agentId))
      }

      // Create query with all constraints
      const emailsQuery = query(
        collection(db, 'emailHistory'),
        ...constraints
      )

      const snapshot = await getDocs(emailsQuery)
      console.log('Found emails:', snapshot.size) // Debug log

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate()
      })) as EmailRecord[]
    } catch (error) {
      console.error('Error fetching email history:', error)
      throw error
    }
  },

  async updateEmailStatus(emailId: string, status: 'sent' | 'under_review' | 'denied' | 'failed') {
    try {
      const emailRef = doc(db, 'emailHistory', emailId)
      await updateDoc(emailRef, {
        status,
        updatedAt: Timestamp.now()
      })

      // If status is 'sent', trigger the email sending
      if (status === 'sent') {
        const emailDoc = await getDoc(emailRef)
        if (emailDoc.exists()) {
          const emailData = emailDoc.data()
          if (!emailData.gmailConnectionId) {
            throw new Error('No Gmail connection found for this email')
          }
          
          // Send via Gmail
          await gmailUtils.sendEmail({
            to: emailData.recipientEmail,
            subject: emailData.subject,
            body: emailData.body,
            connectionId: emailData.gmailConnectionId
          })

          // Update the email record to reflect successful sending
          await updateDoc(emailRef, {
            sentAt: Timestamp.now()
          })
        }
      }
    } catch (error) {
      console.error('Error updating email status:', error)
      // Update the email record with the error
      const emailRef = doc(db, 'emailHistory', emailId)
      await updateDoc(emailRef, {
        status: 'failed',
        error: error.message,
        updatedAt: Timestamp.now()
      })
      throw error
    }
  },

  async getEmailById(emailId: string) {
    try {
      const emailRef = doc(db, 'emailHistory', emailId)
      const emailDoc = await getDoc(emailRef)
      if (emailDoc.exists()) {
        return {
          id: emailDoc.id,
          ...emailDoc.data()
        } as EmailRecord
      }
      return null
    } catch (error) {
      console.error('Error fetching email:', error)
      throw error
    }
  },

  async createEmailRecord({
    recipientEmail,
    agentId,
    agentName,
    workspaceId,
    subject,
    body,
    status = 'under_review',
    gmailConnectionId,
    error
  }: {
    recipientEmail: string
    agentId: string
    agentName: string
    workspaceId: string
    subject: string
    body: string
    status?: 'sent' | 'under_review' | 'denied' | 'failed'
    gmailConnectionId?: string
    error?: string
  }) {
    try {
      // Create base record with required fields
      const emailRecord: Record<string, any> = {
        recipientEmail,
        agentId,
        agentName,
        workspaceId,
        subject,
        body,
        status,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      // Only add optional fields if they are defined
      if (gmailConnectionId) {
        emailRecord.gmailConnectionId = gmailConnectionId
      }

      if (error) {
        emailRecord.error = error
      }

      const docRef = await addDoc(collection(db, 'emailHistory'), emailRecord)
      return docRef.id
    } catch (error) {
      console.error('Error creating email record:', error)
      throw error
    }
  }
} 