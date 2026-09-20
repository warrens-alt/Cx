import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in ${className}`}>
      {children}
    </div>
  );
}
