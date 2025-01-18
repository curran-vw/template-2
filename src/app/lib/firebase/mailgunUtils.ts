import { db } from './firebase'
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore'
import { nanoid } from 'nanoid'

interface NotificationEmail {
  id: string
  agentId: string
  workspaceId: string
  emailLocalPart: string // e.g., "agent-123abc"
  createdAt: number
  isActive: boolean
}

export const mailgunUtils = {
  async generateNotificationEmail(agentId: string, workspaceId: string): Promise<NotificationEmail> {
    // Generate a unique local part for the email address
    const emailLocalPart = `agent-${nanoid(6)}` // e.g., "agent-x7f2p9"
    
    const notificationEmail: NotificationEmail = {
      id: nanoid(),
      agentId,
      workspaceId,
      emailLocalPart,
      createdAt: Date.now(),
      isActive: true
    }

    // Save to Firestore
    const emailRef = doc(collection(db, 'notification_emails'))
    await setDoc(emailRef, notificationEmail)

    return notificationEmail
  },

  async getNotificationEmail(agentId: string): Promise<NotificationEmail | null> {
    const emailsRef = collection(db, 'notification_emails')
    const q = query(emailsRef, where('agentId', '==', agentId), where('isActive', '==', true))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) return null
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as NotificationEmail
  },

  async findByLocalPart(localPart: string): Promise<NotificationEmail | null> {
    const emailsRef = collection(db, 'notification_emails')
    const q = query(emailsRef, where('emailLocalPart', '==', localPart), where('isActive', '==', true))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) return null
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as NotificationEmail
  },

  getFullEmailAddress(localPart: string): string {
    return `${localPart}@notifications.agentfolio.ai`
  }
} 