import React from 'react';

/** Isolated demo table: no API integration, live-data visual adapter or export controls. */
export default function DemoTable({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return <table className={className} aria-label={label} data-provenance="SYNTHETIC_NOT_REAL_DATA">{children}</table>;
}
