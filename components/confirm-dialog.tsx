"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./loading-spinner";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = "Continue",
  cancelText = "Cancel",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='bg-white'>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='gap-2 sm:gap-0'>
          <AlertDialogCancel asChild>
            <Button variant='outline' onClick={onCancel} className='mt-0'>
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <Button
            variant='default'
            onClick={onConfirm}
            className='bg-black hover:bg-black/90 shadow-none'
            disabled={loading}
          >
            {loading && <LoadingSpinner />}
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
