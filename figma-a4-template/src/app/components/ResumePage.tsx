import { ReactNode } from 'react';

interface ResumePageProps {
  children: ReactNode;
}

export function ResumePage({ children }: ResumePageProps) {
  return (
    <div 
      className="flex flex-row gap-0 bg-white"
      style={{ 
        width: '595px', 
        height: '842px',
        minHeight: '842px',
        maxHeight: '842px',
        overflow: 'hidden', // Clip content enabled
        position: 'relative'
      }}
    >
      {children}
    </div>
  );
}