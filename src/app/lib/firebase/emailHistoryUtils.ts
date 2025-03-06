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
  userInfo?: string
  businessInfo?: string
}

export const emailHistoryUtils = {
  async getEmailHistory(
    workspaceId: string, 
    agentId: string | null = null,
    page: number = 1,
    pageSize: number = 10
  ) {
    try {
      console.log('Getting email history:', { workspaceId, agentId, page, pageSize })

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
      const totalEmails = snapshot.docs.length

      // Calculate pagination
      const startIndex = (page - 1) * pageSize
      const paginatedDocs = snapshot.docs.slice(startIndex, startIndex + pageSize)

      const emails = paginatedDocs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate()
      })) as EmailRecord[]

      return {
        emails: paginatedDocs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate()
        })) as EmailRecord[],
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalEmails / pageSize),
          totalEmails,
          hasNextPage: startIndex + pageSize < totalEmails,
          hasPreviousPage: page > 1
        }
      }
    } catch (error) {
      console.error('Error fetching email history:', error)
      throw error
    }
  },

  async updateEmailStatus(emailId: string, status: 'sent' | 'denied') {
    try {
      const docRef = doc(db, 'emailHistory', emailId)
      const emailDoc = await getDoc(docRef)
      
      if (!emailDoc.exists()) {
        throw new Error('Email record not found')
      }

      const emailData = emailDoc.data()

      // If approving the email, send it
      if (status === 'sent') {
        if (!emailData.gmailConnectionId) {
          throw new Error('No Gmail connection ID found for this email')
        }

        try {
          await gmailUtils.sendEmail({
            connectionId: emailData.gmailConnectionId,
            to: emailData.recipientEmail,
            subject: emailData.subject,
            body: emailData.body
          })

          // Update the status and add sent timestamp
          await updateDoc(docRef, {
            status,
            updatedAt: Timestamp.now(),
            sentAt: Timestamp.now()
          })
        } catch (sendError) {
          console.error('Error sending email:', sendError)
          // If sending fails, mark as failed
          await updateDoc(docRef, {
            status: 'failed',
            error: sendError instanceof Error ? sendError.message : 'Failed to send email',
            updatedAt: Timestamp.now()
          })
          throw sendError
        }
      } else {
        // Just update status for non-send actions (like deny)
        await updateDoc(docRef, {
          status,
          updatedAt: Timestamp.now()
        })
      }

      return true
    } catch (error) {
      console.error('Error updating email status:', error)
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
    error,
    userInfo,
    businessInfo
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
    userInfo?: string
    businessInfo?: string
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
        updatedAt: Timestamp.now(),
        userInfo,
        businessInfo,
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