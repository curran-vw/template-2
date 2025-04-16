"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function UpgradePlanModal({
  title,
  description,
  isOpen,
  setIsOpen,
}: {
  title: string;
  description: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const router = useRouter();
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => router.push("/pricing")}>Upgrade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
