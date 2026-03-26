import { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <div 
      className="flex flex-col gap-6 bg-slate-800 text-white p-6"
      style={{ 
        width: '180px',
        minWidth: '180px',
        maxWidth: '180px',
        height: '100%',
        minHeight: '100%'
      }}
    >
      {children}
    </div>
  );
}