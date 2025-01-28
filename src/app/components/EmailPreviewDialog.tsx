import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface EmailPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function EmailPreviewDialog({ isOpen, onClose, children }: EmailPreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Email Preview</DialogTitle>
        <DialogDescription>
          Preview of the generated email content
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
} 