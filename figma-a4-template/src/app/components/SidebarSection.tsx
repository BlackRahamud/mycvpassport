import { ReactNode } from 'react';

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <h3 
        className="font-semibold text-sm uppercase tracking-wider w-full"
        style={{ 
          width: '100%',
          letterSpacing: '0.05em'
        }}
      >
        {title}
      </h3>
      <div className="flex flex-col gap-2 w-full">
        {children}
      </div>
    </div>
  );
}
