"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/app/components/common/toast"
import { useContext } from 'react'
import { ToastContext } from './toast-context'

export function Toaster() {
  const context = useContext(ToastContext)
  if (!context) return null

  return (
    <ToastProvider>
      {context.toasts.map(({ id, title, description, variant, ...props }) => (
        <Toast key={id} {...props} variant={variant}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && (
              <ToastDescription>{description}</ToastDescription>
            )}
          </div>
          <ToastClose onClick={() => context.removeToast(id)} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
} 