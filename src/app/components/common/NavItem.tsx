'use client';

import Link from 'next/link';
import { Button } from '@/app/components/common/button';
import { cn } from '@/app/lib/utils';

interface NavItemProps {
  icon?: React.ElementType;
  label?: string;
  href: string;
  active?: boolean;
  collapsed?: boolean;
  children?: React.ReactNode;
}

export function NavItem({ icon: Icon, label, href, active, collapsed, children }: NavItemProps) {
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 min-h-[40px]",
          "hover:bg-zinc-800 hover:text-white transition-colors",
          "text-zinc-400 text-sm",
          active && "bg-zinc-800 text-white"
        )}
      >
        {Icon && <Icon className="h-5 w-5 shrink-0" />}
        <span className={cn(
          "transition-[width,opacity] duration-200 ease-in-out",
          collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
        )}>
          {children || label}
        </span>
      </Button>
    </Link>
  );
}

export default NavItem; 