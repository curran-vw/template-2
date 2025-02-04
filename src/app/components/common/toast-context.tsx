"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { ToastProps } from './toast'

interface ExtendedToastProps extends ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastContextType {
  toasts: ExtendedToastProps[]
  addToast: (toast: Omit<ExtendedToastProps, 'id'>) => void
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ExtendedToastProps[]>([])

  const addToast = useCallback((toast: Omit<ExtendedToastProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const value = {
    toasts,
    addToast,
    removeToast
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  const toast = useCallback(
    (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
      context.addToast(props)
    },
    [context]
  )

  return { toast }
} 