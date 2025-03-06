'use client';

import { useAuth } from '@/app/lib/hooks/useAuth';
import { NavItem } from '@/app/components/common/NavItem';

function Sidebar() {
  const { user } = useAuth();
  const isAdminUser = user?.email === 'curranvw@gmail.com';
  
  return (
    <div className="sidebar">
      {/* ... existing sidebar items ... */}
      
      {/* Other navigation items */}
      <NavItem href="/dashboard">Dashboard</NavItem>
      
      {/* Only show logs option for specific user */}
      {isAdminUser && (
        <NavItem href="/logs">Logs</NavItem>
      )}
      
      {/* ... more sidebar items ... */}
    </div>
  );
}

export default Sidebar; 