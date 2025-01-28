import { Inbox } from 'lucide-react'

const navigationItems = [
  // ... existing items
  {
    name: 'Email History',
    href: '/email-history',
    icon: Inbox,
    current: pathname === '/email-history'
  },
  // ... other items
] 