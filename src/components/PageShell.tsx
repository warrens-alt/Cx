import React from 'react';
export function PageShell({children,className=''}:{children:React.ReactNode;className?:string}){
  return <div className={`cx-page ${className}`}>{children}</div>;
}
