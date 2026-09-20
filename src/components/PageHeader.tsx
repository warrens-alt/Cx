import React from 'react';
import { useLocation } from 'react-router-dom';
import { PAGE_TITLES } from '../../contracts/naming';
interface PageHeaderProps { title:string;description?:string;category?:string;badge?:string;children?:React.ReactNode; }
export default function PageHeader({title,description,badge,children}:PageHeaderProps){
  const location=useLocation();
  return <header className="cx-page-header"><div><h1 className="text-page-title">{PAGE_TITLES[location.pathname]||title}</h1>{description&&<p>{description}</p>}{badge&&<span className="cx-status mt-3">{badge}</span>}</div>{children&&<div className="cx-page-actions">{children}</div>}</header>;
}
