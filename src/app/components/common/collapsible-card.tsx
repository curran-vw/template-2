import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/common/card"
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleCardProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function CollapsibleCard({ title, isOpen, onToggle, children }: CollapsibleCardProps) {
  return (
    <Card className="shadow-sm bg-white">
      <CardHeader 
        className="cursor-pointer flex flex-row items-center justify-between"
        onClick={onToggle}
      >
        <CardTitle>{title}</CardTitle>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </CardHeader>
      {isOpen && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
  )
}

