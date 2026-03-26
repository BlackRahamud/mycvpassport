interface EducationItemProps {
  degree: string;
  institution: string;
  period: string;
  details?: string;
}

export function EducationItem({ degree, institution, period, details }: EducationItemProps) {
  return (
    <div className="flex flex-col gap-1 w-full mb-4">
      <h3 
        className="font-semibold text-base text-slate-800 w-full"
        style={{ width: '100%' }}
      >
        {degree}
      </h3>
      <div className="flex flex-row justify-between items-baseline w-full">
        <p 
          className="text-sm text-slate-600 font-medium"
          style={{ width: 'auto' }}
        >
          {institution}
        </p>
        <p 
          className="text-xs text-slate-500"
          style={{ width: 'auto' }}
        >
          {period}
        </p>
      </div>
      {details && (
        <p 
          className="text-sm text-slate-700 w-full"
          style={{ 
            width: '100%',
            wordBreak: 'break-word'
          }}
        >
          {details}
        </p>
      )}
    </div>
  );
}
