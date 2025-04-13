import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleCard({
  title,
  isOpen,
  onToggle,
  children,
  className,
}: CollapsibleCardProps) {
  return (
    <Card className={cn("shadow-sm bg-white", className)}>
      <CardHeader
        className='cursor-pointer flex flex-row items-center justify-between'
        onClick={onToggle}
      >
        <CardTitle>{title}</CardTitle>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  );
}
