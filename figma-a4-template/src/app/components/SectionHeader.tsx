interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-2 w-full mb-4">
      <h2 
        className="font-bold text-xl text-slate-800 w-full"
        style={{ 
          width: '100%'
        }}
      >
        {title}
      </h2>
      <div 
        className="h-0.5 bg-slate-800 w-full"
        style={{ 
          width: '100%'
        }}
      />
    </div>
  );
}
