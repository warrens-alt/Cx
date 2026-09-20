import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  category?: string;
  badge?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, category, badge, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-7">
      <div className="space-y-1.5">
        {(category || badge) && (
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/70 text-xs font-semibold">
                {category}
              </span>
            )}
            {badge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                {badge}
              </span>
            )}
          </div>
        )}
        <h1 className="text-page-title">{title}</h1>
        {description && <p className="text-sm text-text-sec leading-relaxed max-w-3xl pt-0.5">{description}</p>}
      </div>
      {children && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
