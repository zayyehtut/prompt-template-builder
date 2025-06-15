import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex-1 flex flex-col items-center justify-center text-center p-6 border-dashed border-border rounded-lg m-4',
        className
      )}
    >
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        {description}
      </p>
      {children}
    </div>
  );
}; 