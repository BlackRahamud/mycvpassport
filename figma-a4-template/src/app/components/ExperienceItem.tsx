interface ExperienceItemProps {
  title: string;
  company: string;
  period: string;
  description: string[];
}

export function ExperienceItem({ title, company, period, description }: ExperienceItemProps) {
  return (
    <div className="flex flex-col gap-2 w-full mb-5">
      <div className="flex flex-col gap-0.5 w-full">
        <h3 
          className="font-semibold text-base text-slate-800 w-full"
          style={{ width: '100%' }}
        >
          {title}
        </h3>
        <div className="flex flex-row justify-between items-baseline w-full">
          <p 
            className="text-sm text-slate-600 font-medium"
            style={{ width: 'auto' }}
          >
            {company}
          </p>
          <p 
            className="text-xs text-slate-500"
            style={{ width: 'auto' }}
          >
            {period}
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5 w-full pl-4">
        {description.map((item, index) => (
          <li 
            key={index} 
            className="text-sm text-slate-700 w-full list-disc"
            style={{ 
              width: '100%',
              wordBreak: 'break-word'
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
