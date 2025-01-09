'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { LogOut, Settings, User, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onMenuClick?: () => void;
  showMobileMenu?: boolean;
}

export default function TopBar({ onMenuClick, showMobileMenu }: TopBarProps) {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white border-b h-16 flex items-center justify-between">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        {showMobileMenu && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        )}
        
        <div className="w-auto lg:w-64">
          <WorkspaceSwitcher />
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
              "hover:bg-gray-100/80 border border-gray-100",
              "text-sm text-gray-700 font-medium"
            )}
          >
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt="Profile"
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
            )}
            <span>{user?.displayName}</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-gray-900">{user?.displayName}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
              <div className="border-t border-gray-200" />
              <button
                onClick={() => {/* TODO: Add settings functionality */}}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <div className="border-t border-gray-200" />
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 