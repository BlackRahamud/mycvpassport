import { ReactNode } from 'react';

interface ContentAreaPage2Props {
  children: ReactNode;
}

export function ContentAreaPage2({ children }: ContentAreaPage2Props) {
  return (
    <div 
      className="flex flex-col justify-between bg-white flex-1"
      style={{ 
        height: '100%',
        minHeight: '100%',
        paddingTop: '32px',
        paddingLeft: '32px',
        paddingRight: '32px',
        paddingBottom: '40px' // Anti-bleed bottom margin for Puppeteer
      }}
    >
      <div className="flex flex-col gap-0 w-full">
        {children}
      </div>
      {/* Bottom spacer to ensure white background extends to edge */}
      <div style={{ height: '1px', width: '100%' }} />
    </div>
  );
}
