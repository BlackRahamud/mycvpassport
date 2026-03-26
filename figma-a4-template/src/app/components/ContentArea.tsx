import { ReactNode } from 'react';

interface ContentAreaProps {
  children: ReactNode;
}

export function ContentArea({ children }: ContentAreaProps) {
  return (
    <div 
      className="flex flex-col gap-0 bg-white flex-1"
      style={{ 
        height: '100%',
        minHeight: '100%',
        paddingTop: '32px',
        paddingLeft: '32px',
        paddingRight: '32px',
        paddingBottom: '40px' // Anti-bleed bottom margin for Puppeteer
      }}
    >
      {children}
    </div>
  );
}