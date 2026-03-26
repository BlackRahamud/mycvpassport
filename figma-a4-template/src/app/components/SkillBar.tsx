interface SkillBarProps {
  skill: string;
  level: number; // 1-5
}

export function SkillBar({ skill, level }: SkillBarProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <p className="text-xs w-full">{skill}</p>
      <div className="flex flex-row gap-1 w-full">
        {[1, 2, 3, 4, 5].map((dot) => (
          <div
            key={dot}
            className={`h-1.5 flex-1 rounded-full ${
              dot <= level ? 'bg-blue-400' : 'bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
